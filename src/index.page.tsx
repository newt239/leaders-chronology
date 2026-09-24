import { Filters } from "#/components/filters.tsx";
import { GanttChart } from "#/components/gantt-chart.tsx";
import { Legend } from "#/components/legend.tsx";
import { SiteFooter } from "#/components/site-footer.tsx";
import { toDay } from "#/lib/date.ts";
import { languages, translator } from "#/lib/i18n.ts";
import { countries, meta, roleParam } from "#/lib/leaders.ts";

import type { ClientData, Lang, Role } from "#/types/leaders.ts";

const roles: Role[] = ["head_of_state", "head_of_government"];
const minYear = Number(meta.period_start.slice(0, 4));
const maxYear = Number(meta.as_of.slice(0, 4)) - 1;
const siteUrl = "https://leaders-chronology.newt239.deno.net/";
const years = { from: meta.period_start.slice(0, 4), to: meta.as_of.slice(0, 4) };
const absolute = (path: string) => new URL(path, siteUrl).href;

const Page = ({ lang }: { lang: Lang }) => {
  const t = translator(lang);
  const other: Lang = lang === "en" ? "ja" : "en";
  const description = t.get("description", { date: t.date(meta.period_start) });
  const sorted = countries.toSorted((a, b) =>
    lang === "ja" ? a.name_kana.localeCompare(b.name_kana, "ja") : a.name_en.localeCompare(b.name_en, "en")
  );
  const clientData: ClientData = {
    asOf: meta.as_of,
    holders: countries.flatMap((country) =>
      country.offices.flatMap((office) =>
        office.holders.map((holder) => {
          const name = lang === "ja" ? holder.name_ja : holder.name_en;
          const days = ((holder.end ? toDay(holder.end) : toDay(meta.as_of)) - toDay(holder.start)).toLocaleString(
            lang,
          );
          const url = lang === "ja"
            ? holder.wikipedia.ja ?? holder.wikipedia.en
            : holder.wikipedia.en ?? holder.wikipedia.ja;
          return {
            acting: holder.acting,
            days: t.get(holder.end ? "days" : "daysSoFar", { days }),
            end: holder.end,
            linkLabel: t.get("onWikipedia", { name }),
            name,
            office: lang === "ja" ? office.title_ja : office.title_en,
            portraitAlt: t.get("portrait", { name }),
            start: holder.start,
            term: t.get("termRange", {
              end: holder.end ? t.date(holder.end) : t.get("present"),
              start: t.date(holder.start),
            }),
            url,
            urlLang: url?.startsWith("https://ja.") ? "ja" : "en",
          };
        })
      )
    ),
    labels: {
      acting: t.get("acting"),
      daysInOffice: t.get("daysInOffice"),
      nextTerm: t.get("nextTerm"),
      office: t.get("office"),
      previousTerm: t.get("previousTerm"),
      status: t.get("status"),
      term: t.get("term"),
    },
    periodStart: meta.period_start,
  };

  return (
    <>
      {{ __html: "<!doctype html>" }}
      <html lang={lang}>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <meta name="color-scheme" content="light dark" />
          <meta name="description" content={description} />
          <meta property="og:type" content="website" />
          <meta property="og:site_name" content={t.get("title")} />
          <meta property="og:title" content={t.get("title")} />
          <meta property="og:description" content={description} />
          <meta property="og:url" content={absolute(languages[lang].path)} />
          <meta property="og:locale" content={lang === "ja" ? "ja_JP" : "en_US"} />
          <meta property="og:locale:alternate" content={lang === "ja" ? "en_US" : "ja_JP"} />
          <meta property="og:image" content={absolute(`/og/${lang}.png`)} />
          <meta property="og:image:type" content="image/png" />
          <meta property="og:image:width" content="1200" />
          <meta property="og:image:height" content="630" />
          <meta property="og:image:alt" content={t.get("ogImageAlt", years)} />
          <meta name="twitter:card" content="summary_large_image" />
          <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
          <link rel="stylesheet" href="/styles.css" />
          <link rel="alternate" hreflang="en" href={absolute(languages.en.path)} />
          <link rel="alternate" hreflang="ja" href={absolute(languages.ja.path)} />
          <link rel="alternate" hreflang="x-default" href={absolute(languages.en.path)} />
          <title>{t.get("title")}</title>
          <script
            dangerouslySetInnerHTML={{
              __html:
                'document.documentElement.dataset.js="";var o=new URLSearchParams(location.search).get("office");if(o==="government"||o==="both")document.documentElement.dataset.office=o;',
            }}
          />
        </head>
        <body>
          <header class="page-header">
            <div class="page-title">
              <h1>{t.get("title")}</h1>
              <a class="language-switch" href={languages[other].path} hreflang={other} lang={other} data-language-link>
                {t.get("switchLanguage")}
              </a>
            </div>
            <p>{t.get("asOf", { date: t.date(meta.as_of) })}</p>
          </header>

          <main>
            <Filters roles={roles} minYear={minYear} maxYear={maxYear} t={t} />

            {roles.map((role) => (
              <section class="role-block" data-role-block={roleParam[role]} aria-labelledby={`heading-${role}`}>
                <h2 id={`heading-${role}`}>
                  {t.get(role === "head_of_state" ? "headOfState" : "headOfGovernment")}
                </h2>
                <Legend t={t} />
                <div class="chart-scroll">
                  <GanttChart roles={[role]} year={minYear} countries={sorted} lang={lang} t={t} />
                </div>
              </section>
            ))}
            <section class="role-block" data-role-block="both" aria-labelledby="heading-both">
              <h2 id="heading-both">{t.get("bothOffices")}</h2>
              <Legend t={t} />
              <div class="chart-scroll">
                <GanttChart roles={roles} year={minYear} countries={sorted} lang={lang} t={t} />
              </div>
            </section>

            <section class="detail" aria-label={t.get("selectedTerm")} aria-live="polite" data-detail></section>
          </main>

          <SiteFooter t={t} />

          <script
            type="application/json"
            id="client-data"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(clientData).replaceAll("<", "\\u003c") }}
          />
          <script src="/scripts/chart.js"></script>
        </body>
      </html>
    </>
  );
};

export default function* () {
  for (const lang of ["en", "ja"] as const) {
    yield { content: <Page lang={lang} />, url: languages[lang].path };
  }
}
