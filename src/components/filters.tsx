import { roleParam } from "#/lib/leaders.ts";

import type { I18n } from "@libs/i18n";
import type { Role } from "#/types/leaders.ts";

type Props = { roles: Role[]; minYear: number; maxYear: number; t: I18n };

export const Filters = ({ roles, minYear, maxYear, t }: Props) => (
  <details class="filters" data-filters>
    <summary>{t.get("filters")}</summary>
    <form class="filters-form" data-filters-form>
      <fieldset>
        <legend>{t.get("office")}</legend>
        {roles.map((role, i) => (
          <label class="choice">
            <input type="radio" name="office" value={roleParam[role]} checked={i === 0} />
            {t.get(role === "head_of_state" ? "headOfState" : "headOfGovernment")}
          </label>
        ))}
        <label class="choice">
          <input type="radio" name="office" value="both" />
          {t.get("both")}
        </label>
      </fieldset>
      <div class="since">
        <label for="since">{t.get("since")}</label>
        <input
          id="since"
          type="range"
          name="since"
          min={minYear}
          max={maxYear}
          step="5"
          value={minYear}
          data-since-input
        />
        <output for="since" data-since-output>{minYear}</output>
      </div>
      <div class="filters-actions">
        <button type="submit">{t.get("apply")}</button>
      </div>
    </form>
  </details>
);
