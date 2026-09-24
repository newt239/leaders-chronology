import type { I18n } from "@libs/i18n";

export const Legend = ({ t }: { t: I18n }) => (
  <ul class="legend" aria-label={t.get("legend")}>
    <li>
      <span class="swatch tone-a" aria-hidden="true"></span>
      <span class="swatch tone-b" aria-hidden="true"></span>
      {t.get("term")}
    </li>
    <li>
      <span class="swatch tone-acting" aria-hidden="true"></span>
      {t.get("acting")}
    </li>
    <li>
      <span class="swatch founded" aria-hidden="true"></span>
      {t.get("founded")}
    </li>
    <li>
      <span class="swatch selected" aria-hidden="true"></span>
      {t.get("selected")}
    </li>
  </ul>
);
