import { roleParam } from "#/lib/leaders.ts";

import type { I18n } from "@libs/i18n";
import type { Role } from "#/types/leaders.ts";

type Props = { roles: Role[]; minYear: number; endYear: number; since: number; t: I18n };

export const Filters = ({ roles, minYear, endYear, since, t }: Props) => {
  const sliderMax = minYear + Math.ceil((endYear - minYear) / 5) * 5;
  return (
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
        <div class="years">
          <div class="year-range">
            <label for="since">{t.get("since")}</label>
            <input
              id="since"
              type="range"
              name="since"
              min={minYear}
              max={sliderMax - 5}
              step="5"
              value={since}
              data-since-input
            />
            <output for="since" data-since-output>{since}</output>
          </div>
          <div class="year-range">
            <label for="until">{t.get("until")}</label>
            <input
              id="until"
              type="range"
              name="until"
              min={minYear + 5}
              max={sliderMax}
              step="5"
              value={sliderMax}
              data-until-input
            />
            <output for="until" data-until-output>{endYear}</output>
          </div>
        </div>
        <div class="filters-actions">
          <button type="submit">{t.get("apply")}</button>
        </div>
      </form>
    </details>
  );
};
