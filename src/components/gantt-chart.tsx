import { toDay } from "#/lib/date.ts";
import { barGeometry, createScale, layout, ticks } from "#/lib/geometry.ts";
import { meta } from "#/lib/leaders.ts";

import type { I18n } from "@libs/i18n";
import type { Country, Lang, Role } from "#/types/leaders.ts";

type Props = { role: Role; year: number; countries: Country[]; lang: Lang; t: I18n };

export const GanttChart = ({ role, year, countries, lang, t }: Props) => {
  const scale = createScale(year, meta.period_start, meta.as_of);
  const periodStart = toDay(meta.period_start);
  const width = layout.labelWidth + layout.plotWidth + layout.rightPad;
  const height = layout.axisHeight + countries.length * layout.rowHeight + 8;
  const plotTop = layout.axisHeight;
  const plotBottom = height - 8;
  const barOffset = (layout.rowHeight - layout.barHeight) / 2;

  return (
    <svg
      class="chart"
      viewBox={`0 0 ${width} ${height}`}
      width={String(width)}
      height={String(height)}
      role="group"
      tabindex="-1"
      aria-label={t.get(role === "head_of_state" ? "headOfState" : "headOfGovernment")}
      data-plot-top={plotTop}
      data-plot-bottom={plotBottom}
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
      {countries.map((country, r) => {
        const y = plotTop + r * layout.rowHeight;
        const office = country.offices.find((o) => o.role === role);
        const founded = toDay(country.display_from);
        const bars = (office?.holders ?? []).map((holder, i) => ({
          geometry: barGeometry(toDay(holder.start), holder.end ? toDay(holder.end) : scale.to, founded, scale),
          holder,
          tone: holder.acting ? "acting" : i % 2 === 0 ? "a" : "b",
        }));
        const first = bars.findIndex((bar) => bar.geometry);
        const countryName = lang === "ja" ? country.name_ja : country.name_en;
        return (
          <g class="row" role="group" aria-label={countryName} data-from={country.display_from}>
            <text
              class="row-label"
              x={String(layout.labelWidth - 12)}
              y={String(y + layout.rowHeight / 2)}
              text-anchor="end"
              dominant-baseline="central"
              aria-hidden="true"
            >
              {countryName}
            </text>
            {office === undefined && (
              <text
                class="no-post"
                x={String(layout.labelWidth + 8)}
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
      })}
    </svg>
  );
};
