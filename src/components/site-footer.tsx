import type { I18n } from "@libs/i18n";

const links = [
  { href: "https://x.com/newt239", label: "X" },
  { href: "https://github.com/newt239", label: "GitHub" },
];

export const SiteFooter = ({ t }: { t: I18n }) => (
  <footer class="page-footer">
    <p>© {new Date().getUTCFullYear()} newt</p>
    <ul class="social" aria-label={t.get("social")}>
      {links.map((link) => (
        <li>
          <a href={link.href} rel="me">{link.label}</a>
        </li>
      ))}
    </ul>
  </footer>
);
