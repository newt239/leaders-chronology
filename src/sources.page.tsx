import { SiteFooter } from "#/components/site-footer.tsx";
import { languages, translator } from "#/lib/i18n.ts";
import { meta, sortedCountries } from "#/lib/leaders.ts";

import type { Lang, Source } from "#/types/leaders.ts";

const siteUrl = "https://leaders-chronology.newt239.deno.net/";
const absolute = (path: string) => new URL(path, siteUrl).href;
const sourceLang = (url: string): Lang => (new URL(url).hostname.startsWith("ja.") ? "ja" : "en");

const SourceLink = ({ lang, source }: { lang: Lang; source: Source }) => {
  const linkLang = sourceLang(source.url);
  return (
    <a href={source.url} hreflang={linkLang} lang={linkLang === lang ? undefined : linkLang}>
      {source.title}
    </a>
  );
};

const Page = ({ lang }: { lang: Lang }) => {
  const t = translator(lang);
  const other: Lang = lang === "en" ? "ja" : "en";
  const title = `${t.get("sources")} | ${t.get("title")}`;
  const general: Source[] = [
    {
      title: lang === "ja" ? meta.office_basis.source : "Ministry of Foreign Affairs of Japan",
      url: meta.office_basis.url,
    },
    { title: "Wikidata", url: "https://www.wikidata.org/" },
  ];

  return (
    <>
      {{ __html: "<!doctype html>" }}
      <html lang={lang}>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <meta name="color-scheme" content="light dark" />
          <meta name="description" content={t.get("sourcesDescription")} />
          <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
          <link rel="stylesheet" href="/styles.css" />
          <link rel="alternate" hreflang="en" href={absolute(languages.en.sources)} />
          <link rel="alternate" hreflang="ja" href={absolute(languages.ja.sources)} />
          <link rel="alternate" hreflang="x-default" href={absolute(languages.en.sources)} />
          <title>{title}</title>
        </head>
        <body>
          <header class="page-header">
            <div class="page-title">
              <h1>{t.get("sources")}</h1>
              <a class="language-switch" href={languages[other].sources} hreflang={other} lang={other}>
                {t.get("switchLanguage")}
              </a>
            </div>
            <p>
              <a href={languages[lang].path}>{t.get("backToChart")}</a>
            </p>
          </header>

          <main class="sources">
            <section aria-labelledby="sources-all">
              <h2 id="sources-all">{t.get("allCountries")}</h2>
              <ul>
                {general.map((source) => (
                  <li>
                    <SourceLink lang={lang} source={source} />
                  </li>
                ))}
              </ul>
            </section>
            {sortedCountries(lang).map((country) => (
              <section aria-labelledby={`sources-${country.id}`}>
                <h2 id={`sources-${country.id}`}>{lang === "ja" ? country.name_ja : country.name_en}</h2>
                <dl>
                  {country.offices.map((office) => (
                    <>
                      <dt>{lang === "ja" ? office.title_ja : office.title_en}</dt>
                      <dd>
                        <ul>
                          {office.sources.map((source) => (
                            <li>
                              <SourceLink lang={lang} source={source} />
                            </li>
                          ))}
                          {office.wikidata.map((id) => (
                            <li>
                              <a href={`https://www.wikidata.org/wiki/${id}`}>{t.get("wikidataItem", { id })}</a>
                            </li>
                          ))}
                        </ul>
                      </dd>
                    </>
                  ))}
                </dl>
              </section>
            ))}
          </main>

          <SiteFooter lang={lang} t={t} />
        </body>
      </html>
    </>
  );
};

export default function* () {
  for (const lang of ["en", "ja"] as const) {
    yield { content: <Page lang={lang} />, url: languages[lang].sources };
  }
}
