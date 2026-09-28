import data from "../data/leaders.json" with { type: "json" };
import { isIsoDate, toDay } from "#/lib/date.ts";

type Binding = Record<string, { value: string } | undefined>;

type Holder = {
  name_ja: string;
  name_en: string;
  start: string;
  end: string | null;
  acting: boolean;
  note: string | null;
  wikipedia: { en: string | null; ja: string | null };
  wikidata: string | null;
};

type Term = {
  person: string;
  name_en: string;
  name_ja: string;
  start: string;
  end: string | null;
  acting: boolean;
  approximate: boolean;
  wikipedia: { en: string | null; ja: string | null };
};

type Undated = { person: string; name: string; end: string | null; alive: boolean };

const ENDPOINT = "https://query.wikidata.org/sparql";
const USER_AGENT = "leaders-chronology/1.0 (https://github.com/newt239/leaders-chronology)";
const ACTING = "Q4676846";
const OUTPUT = new URL("../data/leaders.json", import.meta.url);
const CONTINUATION_DAYS = 30;

const asOf = new Date().toISOString().slice(0, 10);
const messages: string[] = [];

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

const toDate = (time: string | undefined, precision: string | undefined) => {
  if (!time || !precision) {
    return null;
  }
  const date = time.slice(0, 10);
  const rounded = precision === "11"
    ? date
    : precision === "10"
    ? `${date.slice(0, 7)}-01`
    : precision === "9"
    ? `${date.slice(0, 4)}-01-01`
    : "";
  return isIsoDate(rounded) ? { approximate: precision !== "11", date: rounded } : null;
};

const fetchTerms = async (offices: string[]) => {
  const query = `
    SELECT ?office ?person ?enLabel ?mulLabel ?jaLabel ?start ?startPrecision ?end ?endPrecision ?acting ?dead ?enwiki ?jawiki WHERE {
      VALUES ?office { ${offices.map((id) => `wd:${id}`).join(" ")} }
      ?person wdt:P31 wd:Q5; p:P39 ?statement.
      ?statement ps:P39 ?office.
      FILTER NOT EXISTS { ?statement wikibase:rank wikibase:DeprecatedRank }
      OPTIONAL { ?statement pqv:P580 [ wikibase:timeValue ?start; wikibase:timePrecision ?startPrecision ] }
      OPTIONAL { ?statement pqv:P582 [ wikibase:timeValue ?end; wikibase:timePrecision ?endPrecision ] }
      BIND(EXISTS { ?statement pq:P2868|pq:P5102 wd:${ACTING} } AS ?acting)
      BIND(EXISTS { ?person wdt:P570 [] } AS ?dead)
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
  const terms = new Map<string, { dated: Term[]; undated: Undated[] }>();
  for (const row of parseBindings(await res.json())) {
    const office = qid(row.office?.value ?? "");
    const person = qid(row.person?.value ?? "");
    const nameEn = row.enLabel?.value ?? row.mulLabel?.value ?? person;
    const entry = terms.get(office) ?? { dated: [], undated: [] };
    terms.set(office, entry);
    const start = toDate(row.start?.value, row.startPrecision?.value);
    const end = toDate(row.end?.value, row.endPrecision?.value);
    if (!start) {
      entry.undated.push({ alive: row.dead?.value !== "true", end: end?.date ?? null, name: nameEn, person });
      continue;
    }
    entry.dated.push({
      acting: row.acting?.value === "true",
      approximate: start.approximate || (end?.approximate ?? false),
      end: end?.date ?? null,
      name_en: nameEn,
      name_ja: row.jaLabel?.value ?? nameEn,
      person,
      start: start.date,
      wikipedia: { en: row.enwiki?.value ?? null, ja: row.jawiki?.value ?? null },
    });
  }
  return terms;
};

const merge = (terms: Term[]) => {
  const unique = new Map(terms.map((term) => [`${term.person}|${term.start}|${term.end}|${term.acting}`, term]));
  const sorted = [...unique.values()].toSorted((a, b) =>
    a.start.localeCompare(b.start) || (a.end ?? "9999").localeCompare(b.end ?? "9999")
  );
  const merged: Term[] = [];
  for (const term of sorted) {
    const prev = merged.findLast((earlier) => earlier.person === term.person && earlier.acting === term.acting);
    if (prev && (prev.end === null || toDay(term.start) <= toDay(prev.end) + 1)) {
      prev.end = prev.end === null || term.end === null ? null : term.end > prev.end ? term.end : prev.end;
      prev.approximate ||= term.approximate;
      continue;
    }
    merged.push({ ...term });
  }
  return merged;
};

const clamp = (end: string | null) => (end !== null && end > asOf ? null : end);

const update = (holders: Holder[], terms: Term[], where: string) => {
  const result = holders.map((holder) => ({ ...holder }));
  const lastStart = result.at(-1)?.start ?? data.meta.period_start;
  for (const holder of result.filter((holder) => holder.end === null && holder.wikidata !== null)) {
    const term = terms.findLast((term) => term.person === holder.wikidata && term.start <= holder.start);
    const end = clamp(term?.end ?? null);
    if (end !== null && end >= holder.start) {
      holder.end = end;
      messages.push(`${where}: ${holder.name_en} left office on ${end}`);
    }
  }
  for (const term of terms.filter((term) => term.start > lastStart && term.start <= asOf)) {
    const prev = result.at(-1);
    if (
      prev && prev.wikidata === term.person && prev.acting === term.acting &&
      (prev.end === null || toDay(term.start) - toDay(prev.end) <= CONTINUATION_DAYS)
    ) {
      prev.end = clamp(term.end);
      continue;
    }
    if (!term.acting) {
      for (const open of result.filter((holder) => holder.end === null)) {
        open.end = term.start;
        messages.push(`${where}: ${open.name_en} closed at ${term.start} because a successor took office`);
      }
    }
    result.push({
      name_ja: term.name_ja,
      name_en: term.name_en,
      start: term.start,
      end: clamp(term.end),
      acting: term.acting,
      note: null,
      wikipedia: term.wikipedia,
      wikidata: term.person,
    });
    messages.push(
      `${where}: added ${term.name_en} (${term.person}) ${term.start} – ${term.end ?? "present"}${
        term.acting ? ", acting" : ""
      }${term.approximate ? ", approximate date" : ""}`,
    );
  }
  return result;
};

const terms = await fetchTerms(
  data.countries.flatMap((country) => country.offices.flatMap((office) => office.wikidata)),
);

const countries = data.countries.map((country) => ({
  ...country,
  offices: country.offices.map((office) => {
    const where = `${country.id}/${office.role}`;
    const entries = office.wikidata.map((id) => terms.get(id) ?? { dated: [], undated: [] });
    const known = new Set(office.holders.map((holder) => holder.wikidata));
    const lastStart = office.holders.at(-1)?.start ?? data.meta.period_start;
    const undated = entries.flatMap((entry) => entry.undated).filter((term) =>
      !known.has(term.person) && (term.end === null ? term.alive : term.end > lastStart)
    );
    for (const term of new Map(undated.map((term) => [term.person, term])).values()) {
      messages.push(`${where}: ${term.name} (${term.person}) has no start date on Wikidata`);
    }
    return { ...office, holders: update(office.holders, merge(entries.flatMap((entry) => entry.dated)), where) };
  }),
}));

await Deno.writeTextFile(
  OUTPUT,
  `${JSON.stringify({ ...data, countries, meta: { ...data.meta, as_of: asOf } }, null, 2)}\n`,
);
for (const message of messages) {
  console.error(message);
}
