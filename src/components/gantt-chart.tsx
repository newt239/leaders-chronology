import { toDay } from "#/lib/date.ts";
import { barGeometry, createScale, layout, ticks } from "#/lib/geometry.ts";
import { meta } from "#/lib/leaders.ts";

import type { I18n } from "@libs/i18n";
import type { Country, Lang, Role } from "#/types/leaders.ts";

type Props = { roles: Role[]; since: number; until: number; countries: Country[]; lang: Lang; t: I18n };

export const GanttChart = ({ roles, since, until, countries, lang, t }: Props) => {
  const both = roles.length > 1;
  const plotWidth = layout.contentWidth - (both ? layout.laneLabelWidth : 0);
  const scale = createScale(since, until, meta.period_start, meta.as_of, plotWidth);
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
  const nameWidth = layout.labelWidth - layout.plotPadding;
  const width = plotWidth + layout.plotPadding * 2;
  const height = plotBottom + 8;
  const roleName = (role: Role) => t.get(role === "head_of_state" ? "headOfState" : "headOfGovernment");
  const countryName = (country: Country) => lang === "ja" ? country.name_ja : country.name_en;
  const countryLabel = (group: (typeof groups)[number], name: string, className: string, anchor: "start" | "end") => (
    <text
      class={className}
      x={anchor === "end" ? "100%" : "0"}
      dx={anchor === "end" ? "-8" : "8"}
      y={String(group.top + (group.lanes.length * layout.rowHeight) / 2)}
      text-anchor={anchor}
      dominant-baseline="central"
      data-country={group.country.id}
    >
      {name}
    </text>
  );

  return (
    <div class="chart-frame">
      <svg class="chart-labels chart-names" width={String(nameWidth)} height={String(height)} aria-hidden="true">
        {groups.map((group) => countryLabel(group, countryName(group.country), "row-label", "end"))}
      </svg>
      {both && (
        <svg
          class="chart-labels chart-lanes"
          width={String(layout.laneLabelWidth)}
          height={String(height)}
          aria-hidden="true"
        >
          {groups.flatMap(({ lanes, top }) =>
            lanes.map(({ role }, laneIndex) => (
              <text
                class="lane-label"
                x="100%"
                dx="-8"
                y={String(top + laneIndex * layout.rowHeight + layout.rowHeight / 2)}
                text-anchor="end"
                dominant-baseline="central"
              >
                {t.get(role === "head_of_state" ? "stateShort" : "governmentShort")}
              </text>
            ))
          )}
        </svg>
      )}
      <div class="chart-scroll">
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
          data-plot-width={plotWidth}
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
                  aria-label={both ? `${countryName(country)} ${roleName(role)}` : countryName(country)}
                  data-from={country.display_from}
                  data-country={country.id}
                >
                  {office === undefined && (
                    <text
                      class="no-post"
                      x={String(layout.plotPadding + 8)}
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
                      display={founded > scale.from && founded <= scale.to ? undefined : "none"}
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
                            country: countryName(country),
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
      </div>
      <svg class="chart-labels chart-end" width={String(nameWidth)} height={String(height)} aria-hidden="true">
        {groups.map((group) => countryLabel(group, countryName(group.country), "row-label", "start"))}
      </svg>
    </div>
  );
};
