import { languages } from "#/lib/i18n.ts";
import { meta } from "#/lib/leaders.ts";

import type { I18n } from "@libs/i18n";
import type { Lang } from "#/types/leaders.ts";

const links = [
  { href: "https://github.com/newt239/leaders-chronology", label: "GitHub", rel: undefined },
  { href: "https://x.com/newt239", label: "X", rel: "me" },
];

export const SiteFooter = ({ lang, t }: { lang: Lang; t: I18n }) => (
  <footer class="page-footer">
    <p
      class="data-note"
      dangerouslySetInnerHTML={{
        __html: t.md("dataNote", {
          issues: "https://github.com/newt239/leaders-chronology/issues",
          mofa: meta.office_basis.url,
          sources: languages[lang].sources,
          wikidata: "https://www.wikidata.org/",
        }),
      }}
    />
    <p>© {new Date().getUTCFullYear()} newt</p>
    <ul class="social" aria-label={t.get("social")}>
      {links.map((link) => (
        <li>
          <a href={link.href} rel={link.rel}>{link.label}</a>
        </li>
      ))}
    </ul>
  </footer>
);
