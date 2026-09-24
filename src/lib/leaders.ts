import source from "../../data/leaders.json" with { type: "json" };
import { isIsoDate } from "#/lib/date.ts";

import type { Country, Role } from "#/types/leaders.ts";

const isRole = (role: string): role is Role => role === "head_of_state" || role === "head_of_government";

const errors: string[] = [];
const asOf = source.meta.as_of;
if (!isIsoDate(asOf) || !isIsoDate(source.meta.period_start)) {
  errors.push("Invalid meta.as_of or meta.period_start");
}
for (const country of source.countries) {
  if (!isIsoDate(country.display_from)) {
    errors.push(`${country.id}: invalid display_from ${country.display_from}`);
  }
  const roles = new Set<string>();
  for (const office of country.offices) {
    const where = `${country.id}/${office.role}`;
    if (!isRole(office.role) || roles.has(office.role)) {
      errors.push(`${where}: invalid or duplicate role`);
    }
    roles.add(office.role);
    office.holders.forEach((holder, i) => {
      const who = `${where}/${holder.name_en}`;
      if (!isIsoDate(holder.start) || (holder.end !== null && !isIsoDate(holder.end))) {
        errors.push(`${who}: invalid date`);
        return;
      }
      if (holder.end !== null && holder.end < holder.start) {
        errors.push(`${who}: end ${holder.end} is before start ${holder.start}`);
      }
      if (holder.start > asOf || (holder.end !== null && holder.end > asOf)) {
        errors.push(`${who}: date is after as_of ${asOf}`);
      }
      const prev = office.holders[i - 1];
      if (prev && prev.start > holder.start) {
        errors.push(`${who}: start dates are not ascending`);
      }
      if (holder.end === null && i !== office.holders.length - 1) {
        errors.push(`${who}: only the last term may have end: null`);
      }
    });
  }
}
if (errors.length > 0) {
  throw new Error(`Data validation failed:\n${errors.join("\n")}`);
}

export const meta = source.meta;

let nextId = 0;
export const countries: Country[] = source.countries.map((country) => ({
  display_from: country.display_from,
  id: country.id,
  name_en: country.name_en,
  name_ja: country.name_ja,
  name_kana: country.name_kana,
  offices: country.offices.flatMap((office) =>
    isRole(office.role)
      ? [{
        holders: office.holders.map((holder) => ({
          acting: holder.acting,
          end: holder.end,
          id: nextId++,
          name_en: holder.name_en,
          name_ja: holder.name_ja,
          start: holder.start,
          wikipedia: holder.wikipedia,
        })),
        role: office.role,
        title_en: office.title_en,
        title_ja: office.title_ja,
      }]
      : []
  ),
}));

export const roleParam: Record<Role, string> = {
  head_of_government: "government",
  head_of_state: "state",
};
