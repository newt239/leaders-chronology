import { toDay } from "#/lib/date.ts";
import { barGeometry, createScale, layout, ticks } from "#/lib/geometry.ts";
import { meta } from "#/lib/leaders.ts";

import type { I18n } from "@libs/i18n";
import type { Country, Lang, Role } from "#/types/leaders.ts";

type Props = { roles: Role[]; year: number; countries: Country[]; lang: Lang; t: I18n };

export const GanttChart = ({ roles, year, countries, lang, t }: Props) => {
  const both = roles.length > 1;
  const labelWidth = both ? layout.bothLabelWidth : layout.labelWidth;
  const scale = createScale(year, meta.period_start, meta.as_of, labelWidth);
  const periodStart = toDay(meta.period_start);
  const plotTop = layout.axisHeight;
  const barOffset = (layout.rowHeight - layout.barHeight) / 2;

  let cursor = plotTop;
  const groups = countries.map((country) => {
    const lanes = roles.flatMap((role) => {
      const office = country.offices.find((o) => o.role === role);
      return both && !office ? [] : [{ office, role }];
    });
    const top = cursor;
    cursor += lanes.length * layout.rowHeight + (both ? layout.countryGap : 0);
    return { country, lanes, top };
  });
  const plotBottom = cursor;
  const width = labelWidth + layout.plotWidth + layout.rightPad;
  const height = plotBottom + 8;
  const roleName = (role: Role) => t.get(role === "head_of_state" ? "headOfState" : "headOfGovernment");

  return (
    <svg
      class="chart"
      viewBox={`0 0 ${width} ${height}`}
      width={String(width)}
      height={String(height)}
      role="group"
      tabindex="-1"
      aria-label={both ? t.get("bothOffices") : roleName(roles[0] ?? "head_of_state")}
      data-plot-top={plotTop}
      data-plot-bottom={plotBottom}
      data-label-width={labelWidth}
    >
      <g class="axis" aria-hidden="true" data-axis>
        {ticks(scale).map((tick) => (
          <>
            <line
              class="grid"
              x1={String(tick.x)}
              x2={String(tick.x)}
              y1={String(plotTop - 4)}
              y2={String(plotBottom)}
            />
            <text x={String(tick.x)} y={String(plotTop - 10)} text-anchor="middle">{tick.year}</text>
          </>
        ))}
      </g>
      {groups.map(({ country, lanes, top }) => {
        const founded = toDay(country.display_from);
        const countryName = lang === "ja" ? country.name_ja : country.name_en;
        return lanes.map(({ office, role }, laneIndex) => {
          const y = top + laneIndex * layout.rowHeight;
          const bars = (office?.holders ?? []).map((holder, i) => ({
            geometry: barGeometry(toDay(holder.start), holder.end ? toDay(holder.end) : scale.to, founded, scale),
            holder,
            tone: holder.acting ? "acting" : i % 2 === 0 ? "a" : "b",
          }));
          const first = bars.findIndex((bar) => bar.geometry);
          return (
            <g
              class="row"
              role="group"
              aria-label={both ? `${countryName} ${roleName(role)}` : countryName}
              data-from={country.display_from}
            >
              {laneIndex === 0 && (
                <text
                  class="row-label"
                  x={String(both ? layout.bothLabelWidth - 112 : labelWidth - 12)}
                  y={String(top + (lanes.length * layout.rowHeight) / 2)}
                  text-anchor="end"
                  dominant-baseline="central"
                  aria-hidden="true"
                >
                  {countryName}
                </text>
              )}
              {both && (
                <text
                  class="lane-label"
                  x={String(labelWidth - 12)}
                  y={String(y + layout.rowHeight / 2)}
                  text-anchor="end"
                  dominant-baseline="central"
                  aria-hidden="true"
                >
                  {t.get(role === "head_of_state" ? "stateShort" : "governmentShort")}
                </text>
              )}
              {office === undefined && (
                <text
                  class="no-post"
                  x={String(labelWidth + 8)}
                  y={String(y + layout.rowHeight / 2)}
                  dominant-baseline="central"
                >
                  {t.get("noSeparateOffice")}
                </text>
              )}
              {founded > periodStart && (
                <line
                  class="founded"
                  x1={String(scale.xOf(founded))}
                  x2={String(scale.xOf(founded))}
                  y1={String(y + 2)}
                  y2={String(y + layout.rowHeight - 2)}
                  display={founded > scale.from ? undefined : "none"}
                  aria-hidden="true"
                  data-founded={country.display_from}
                />
              )}
              {bars.map((bar, i) => {
                const name = lang === "ja" ? bar.holder.name_ja : bar.holder.name_en;
                const estimate = [...name].reduce(
                  (sum, char) => sum + layout.barLabelSize * (char.charCodeAt(0) >= 0x3000 ? 1 : 0.56),
                  0,
                );
                const fits = bar.geometry !== null &&
                  estimate + layout.barLabelPadding * 2 <= bar.geometry.width;
                return (
                  <>
                    <rect
                      class={`bar tone-${bar.tone}`}
                      x={String(bar.geometry?.x ?? 0)}
                      y={String(y + barOffset)}
                      width={String(bar.geometry?.width ?? 0)}
                      height={layout.barHeight}
                      rx="2"
                      display={bar.geometry ? undefined : "none"}
                      role="button"
                      tabindex={i === first ? 0 : -1}
                      aria-label={t.get(bar.holder.acting ? "barLabelActing" : "barLabel", {
                        country: countryName,
                        end: bar.holder.end ? t.date(bar.holder.end) : t.get("present"),
                        name,
                        start: t.date(bar.holder.start),
                      })}
                      data-holder={bar.holder.id}
                    />
                    <text
                      class={`bar-label label-${bar.tone}`}
                      x={String((bar.geometry?.x ?? 0) + layout.barLabelPadding)}
                      y={String(y + layout.rowHeight / 2)}
                      dominant-baseline="central"
                      display={bar.geometry ? undefined : "none"}
                      visibility={fits ? undefined : "hidden"}
                      aria-hidden="true"
                      data-label-for={bar.holder.id}
                      data-estimate={String(Math.round(estimate))}
                    >
                      {name}
                    </text>
                  </>
                );
              })}
            </g>
          );
        });
      })}
    </svg>
  );
};
