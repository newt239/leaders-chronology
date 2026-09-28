import config from "../data/countries.json" with { type: "json" };
import { isIsoDate, toDay } from "#/lib/date.ts";

type Binding = Record<string, { value: string } | undefined>;

type Term = {
  person: string;
  name_en: string;
  name_ja: string;
  start: string;
  end: string | null;
  acting: boolean;
  wikipedia: { en: string | null; ja: string | null };
};

const ENDPOINT = "https://query.wikidata.org/sparql";
const USER_AGENT = "leaders-chronology/1.0 (https://github.com/newt239/leaders-chronology)";
const ACTING = "Q4676846";
const OUTPUT = new URL("../data/leaders.json", import.meta.url);

const asOf = new Date().toISOString().slice(0, 10);
const periodStart = config.meta.period_start;
const warnings: string[] = [];

const isBinding = (value: unknown): value is Binding =>
  typeof value === "object" && value !== null &&
  Object.values(value).every((cell) =>
    typeof cell === "object" && cell !== null && "value" in cell && typeof cell.value === "string"
  );

const parseBindings = (json: unknown) => {
  if (typeof json !== "object" || json === null || !("results" in json)) {
    throw new Error("Unexpected SPARQL response");
  }
  const { results } = json;
  if (typeof results !== "object" || results === null || !("bindings" in results)) {
    throw new Error("Unexpected SPARQL response");
  }
  const { bindings } = results;
  if (!Array.isArray(bindings) || !bindings.every(isBinding)) {
    throw new Error("Unexpected SPARQL response");
  }
  return bindings;
};

const qid = (uri: string) => uri.slice(uri.lastIndexOf("/") + 1);

const toDate = (time: string | undefined, precision: string | undefined, where: string) => {
  if (!time || !precision) {
    return null;
  }
  const date = time.slice(0, 10);
  if (precision === "11" && isIsoDate(date)) {
    return date;
  }
  const rounded = precision === "10" ? `${date.slice(0, 7)}-01` : precision === "9" ? `${date.slice(0, 4)}-01-01` : "";
  if (!isIsoDate(rounded)) {
    warnings.push(`${where}: unusable date ${time} (precision ${precision})`);
    return null;
  }
  warnings.push(`${where}: date ${time} rounded to ${rounded}`);
  return rounded;
};

const fetchTerms = async (offices: string[]) => {
  const query = `
    SELECT ?office ?person ?enLabel ?mulLabel ?jaLabel ?start ?startPrecision ?end ?endPrecision ?acting ?enwiki ?jawiki WHERE {
      VALUES ?office { ${offices.map((id) => `wd:${id}`).join(" ")} }
      ?person wdt:P31 wd:Q5; p:P39 ?statement.
      ?statement ps:P39 ?office.
      FILTER NOT EXISTS { ?statement wikibase:rank wikibase:DeprecatedRank }
      OPTIONAL { ?statement pqv:P580 [ wikibase:timeValue ?start; wikibase:timePrecision ?startPrecision ] }
      OPTIONAL { ?statement pqv:P582 [ wikibase:timeValue ?end; wikibase:timePrecision ?endPrecision ] }
      BIND(EXISTS { ?statement pq:P2868|pq:P5102 wd:${ACTING} } AS ?acting)
      OPTIONAL { ?person rdfs:label ?enLabel FILTER(LANG(?enLabel) = "en") }
      OPTIONAL { ?person rdfs:label ?mulLabel FILTER(LANG(?mulLabel) = "mul") }
      OPTIONAL { ?person rdfs:label ?jaLabel FILTER(LANG(?jaLabel) = "ja") }
      OPTIONAL { ?enwiki schema:about ?person; schema:isPartOf <https://en.wikipedia.org/> }
      OPTIONAL { ?jawiki schema:about ?person; schema:isPartOf <https://ja.wikipedia.org/> }
    }`;
  const res = await fetch(ENDPOINT, {
    body: new URLSearchParams({ query }),
    headers: { "Accept": "application/sparql-results+json", "User-Agent": USER_AGENT },
    method: "POST",
  });
  if (!res.ok) {
    throw new Error(`Wikidata query failed: ${res.status} ${await res.text()}`);
  }
  const terms = new Map<string, Term[]>();
  for (const row of parseBindings(await res.json())) {
    const office = qid(row.office?.value ?? "");
    const person = qid(row.person?.value ?? "");
    const nameEn = row.enLabel?.value ?? row.mulLabel?.value ?? person;
    const where = `${office}/${person} ${nameEn}`;
    const start = toDate(row.start?.value, row.startPrecision?.value, where);
    if (!start) {
      warnings.push(`${where}: no start date`);
      continue;
    }
    terms.set(office, [...terms.get(office) ?? [], {
      acting: row.acting?.value === "true",
      end: toDate(row.end?.value, row.endPrecision?.value, where),
      name_en: nameEn,
      name_ja: row.jaLabel?.value ?? nameEn,
      person,
      start,
      wikipedia: { en: row.enwiki?.value ?? null, ja: row.jawiki?.value ?? null },
    }]);
  }
  return terms;
};

const normalize = (terms: Term[], where: string) => {
  const unique = new Map(terms.map((term) => [`${term.person}|${term.start}|${term.end}|${term.acting}`, term]));
  const sorted = [...unique.values()].toSorted((a, b) =>
    a.start.localeCompare(b.start) || (a.end ?? "9999").localeCompare(b.end ?? "9999")
  );
  const merged: Term[] = [];
  for (const term of sorted) {
    if (term.end !== null && term.end < term.start) {
      warnings.push(`${where}/${term.name_en}: end ${term.end} is before start ${term.start}`);
      continue;
    }
    const prev = merged.at(-1);
    if (
      prev && prev.person === term.person && prev.acting === term.acting &&
      (prev.end === null || toDay(term.start) <= toDay(prev.end) + 1)
    ) {
      prev.end = prev.end === null || term.end === null ? null : term.end > prev.end ? term.end : prev.end;
      continue;
    }
    merged.push({ ...term });
  }
  const closed = merged.map((term, i) => {
    const next = merged.slice(i + 1).find((later) => !later.acting);
    if (term.end !== null || !next) {
      return term;
    }
    if (next.start >= periodStart) {
      warnings.push(`${where}/${term.name_en}: no end date, closed at ${next.start}`);
    }
    return { ...term, end: next.start };
  });
  return closed
    .filter((term) => term.start <= asOf && (term.end === null || term.end >= periodStart))
    .map((term) => ({ ...term, end: term.end !== null && term.end > asOf ? null : term.end }));
};

const terms = await fetchTerms(
  config.countries.flatMap((country) => country.offices.flatMap((office) => office.wikidata)),
);

const countries = config.countries.map((country) => ({
  ...country,
  offices: country.offices.map((office) => {
    const where = `${country.id}/${office.role}`;
    const holders = normalize(office.wikidata.flatMap((id) => terms.get(id) ?? []), where);
    if (holders.length === 0) {
      warnings.push(`${where}: no holders`);
    }
    return {
      ...office,
      holders: holders.map(({ person, ...holder }) => ({ ...holder, wikidata: person })),
    };
  }),
}));

const output = { meta: { as_of: asOf, ...config.meta }, countries };
await Deno.writeTextFile(OUTPUT, `${JSON.stringify(output, null, 2)}\n`);
for (const warning of new Set(warnings)) {
  console.error(warning);
}
