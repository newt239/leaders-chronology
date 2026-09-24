import { toDay } from "#/lib/date.ts";
import { barGeometry, createScale, ticks } from "#/lib/geometry.ts";

import type { ClientData } from "#/types/leaders.ts";

const SVG_NS = "http://www.w3.org/2000/svg";
const NAV_KEYS = ["ArrowDown", "ArrowUp", "ArrowLeft", "ArrowRight", "End", "Home"];

const data: ClientData = JSON.parse(document.querySelector("#client-data")?.textContent ?? "{}");
const detail = document.querySelector<HTMLElement>("[data-detail]");
const filters = document.querySelector<HTMLDetailsElement>("[data-filters]");
const form = document.querySelector<HTMLFormElement>("[data-filters-form]");
const sinceInput = document.querySelector<HTMLInputElement>("[data-since-input]");
const sinceOutput = document.querySelector<HTMLOutputElement>("[data-since-output]");
const languageLink = document.querySelector<HTMLAnchorElement>("[data-language-link]");
const minYear = Number(data.periodStart.slice(0, 4));
const maxYear = Number(data.asOf.slice(0, 4)) - 1;
const portraits = new Map<string, Promise<string | null>>();
let detailRequest = 0;

const parseSince = (value: string | null) => {
  const year = value && /^\d{4}$/.test(value) ? Number(value) : minYear;
  return Math.min(Math.max(year, minYear), maxYear);
};

const readState = () => {
  const params = new URLSearchParams(location.search);
  return {
    office: params.get("office") === "government" ? "government" : "state",
    since: parseSince(params.get("since")),
  };
};

let state = readState();

const barsOf = (row: Element) =>
  [...row.querySelectorAll<SVGRectElement>("rect.bar")].filter((bar) => bar.getAttribute("display") !== "none");
const center = (bar: SVGRectElement) => bar.x.baseVal.value + bar.width.baseVal.value / 2;

const moveFocusTarget = (target: SVGRectElement) => {
  target.closest("svg")?.querySelectorAll("rect.bar[tabindex='0']").forEach((b) => {
    if (b.closest(".row") === target.closest(".row")) {
      b.setAttribute("tabindex", "-1");
    }
  });
  target.setAttribute("tabindex", "0");
};

const showDetail = (bar: SVGRectElement, focusNav?: "previous" | "next") => {
  const holder = data.holders[Number(bar.dataset.holder)];
  const row = bar.closest(".row");
  if (!holder || !detail || !row) {
    return;
  }
  document.querySelectorAll(".bar[aria-current]").forEach((el) => el.removeAttribute("aria-current"));
  document.querySelectorAll(".row.is-active").forEach((el) => el.classList.remove("is-active"));
  bar.setAttribute("aria-current", "true");
  row.classList.add("is-active");

  const request = ++detailRequest;
  const fields: [string, string][] = [
    [data.labels.office, holder.office],
    [data.labels.term, holder.term],
    [data.labels.daysInOffice, holder.days],
  ];
  if (holder.acting) {
    fields.push([data.labels.status, data.labels.acting]);
  }

  const figure = document.createElement("figure");
  figure.className = "portrait";
  figure.hidden = true;
  const body = document.createElement("div");
  const name = document.createElement("p");
  name.className = "detail-name";
  name.textContent = holder.name;
  const list = document.createElement("dl");
  for (const [term, value] of fields) {
    const dt = document.createElement("dt");
    dt.textContent = term;
    const dd = document.createElement("dd");
    dd.textContent = value;
    list.append(dt, dd);
  }
  body.append(name, list);

  if (holder.url) {
    const link = document.createElement("a");
    link.href = holder.url;
    link.hreflang = holder.urlLang;
    link.textContent = holder.linkLabel;
    const p = document.createElement("p");
    p.append(link);
    body.append(p);

    const page = new URL(holder.url);
    const portrait = portraits.get(holder.url) ??
      fetch(`${page.origin}/api/rest_v1/page/summary/${page.pathname.split("/wiki/")[1] ?? ""}`)
        .then((response) => (response.ok ? response.json() : null))
        .then((summary: { thumbnail?: { source: string } } | null) => summary?.thumbnail?.source ?? null)
        .catch(() => null);
    portraits.set(holder.url, portrait);
    portrait.then((source) => {
      if (!source || request !== detailRequest) {
        return;
      }
      const img = document.createElement("img");
      img.src = source;
      img.alt = holder.portraitAlt;
      img.decoding = "async";
      figure.append(img);
      figure.hidden = false;
    });
  }

  const bars = barsOf(row);
  const index = bars.indexOf(bar);
  const nav = document.createElement("div");
  nav.className = "detail-nav";
  const targets = { next: bars[index + 1], previous: bars[index - 1] };
  for (const direction of ["previous", "next"] as const) {
    const target = targets[direction];
    const button = document.createElement("button");
    button.type = "button";
    button.className = "secondary";
    button.textContent = direction === "previous" ? data.labels.previousTerm : data.labels.nextTerm;
    button.disabled = !target;
    button.addEventListener("click", () => {
      if (target) {
        moveFocusTarget(target);
        showDetail(target, direction);
      }
    });
    nav.append(button);
  }
  body.append(nav);

  detail.replaceChildren(figure, body);
  if (focusNav) {
    const buttons = nav.querySelectorAll("button");
    const preferred = buttons[focusNav === "previous" ? 0 : 1];
    const fallback = buttons[focusNav === "previous" ? 1 : 0];
    (preferred && !preferred.disabled ? preferred : fallback)?.focus();
  }
};

const onKeydown = (event: KeyboardEvent) => {
  const bar = event.target;
  if (!(bar instanceof SVGRectElement) || !bar.classList.contains("bar")) {
    return;
  }
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    showDetail(bar);
    return;
  }
  const row = bar.closest(".row");
  const chart = bar.closest("svg");
  if (!row || !chart || !NAV_KEYS.includes(event.key)) {
    return;
  }
  event.preventDefault();
  const bars = barsOf(row);
  const index = bars.indexOf(bar);
  const rows = [...chart.querySelectorAll(".row")].filter((r) => barsOf(r).length > 0);
  const nextRow = event.key === "ArrowDown"
    ? rows[rows.indexOf(row) + 1]
    : event.key === "ArrowUp"
    ? rows[rows.indexOf(row) - 1]
    : undefined;
  const target = nextRow
    ? barsOf(nextRow).reduce((best, b) =>
      Math.abs(center(b) - center(bar)) < Math.abs(center(best) - center(bar)) ? b : best
    )
    : { ArrowLeft: bars[index - 1], ArrowRight: bars[index + 1], End: bars.at(-1), Home: bars[0] }[event.key];
  if (target) {
    bar.setAttribute("tabindex", "-1");
    moveFocusTarget(target);
    target.focus();
  }
};

const apply = () => {
  const scale = createScale(state.since, data.periodStart, data.asOf);
  document.querySelectorAll<HTMLElement>("[data-role-block]").forEach((block) => {
    block.hidden = block.dataset.roleBlock !== state.office;
  });

  document.querySelectorAll<SVGSVGElement>("svg.chart").forEach((chart) => {
    const top = Number(chart.dataset.plotTop);
    const bottom = Number(chart.dataset.plotBottom);
    chart.querySelector("[data-axis]")?.replaceChildren(
      ...ticks(scale).flatMap((tick) => {
        const line = document.createElementNS(SVG_NS, "line");
        line.setAttribute("class", "grid");
        line.setAttribute("x1", String(tick.x));
        line.setAttribute("x2", String(tick.x));
        line.setAttribute("y1", String(top - 4));
        line.setAttribute("y2", String(bottom));
        const text = document.createElementNS(SVG_NS, "text");
        text.setAttribute("x", String(tick.x));
        text.setAttribute("y", String(top - 10));
        text.setAttribute("text-anchor", "middle");
        text.textContent = String(tick.year);
        return [line, text];
      }),
    );

    chart.querySelectorAll<SVGGElement>(".row").forEach((row) => {
      const visibleFrom = toDay(row.dataset.from ?? data.periodStart);
      const founded = row.querySelector<SVGLineElement>("[data-founded]");
      if (founded) {
        founded.setAttribute("x1", String(scale.xOf(visibleFrom)));
        founded.setAttribute("x2", String(scale.xOf(visibleFrom)));
        founded.setAttribute("display", visibleFrom > scale.from ? "inline" : "none");
      }
      row.querySelectorAll<SVGRectElement>("rect.bar").forEach((bar) => {
        const holder = data.holders[Number(bar.dataset.holder)];
        const geometry = holder
          ? barGeometry(toDay(holder.start), holder.end ? toDay(holder.end) : scale.to, visibleFrom, scale)
          : null;
        bar.setAttribute("display", geometry ? "inline" : "none");
        bar.setAttribute("x", String(geometry?.x ?? 0));
        bar.setAttribute("width", String(geometry?.width ?? 0));
      });
      const visible = barsOf(row);
      const current = visible.find((bar) => bar.getAttribute("tabindex") === "0") ?? visible[0];
      row.querySelectorAll("rect.bar").forEach((bar) => bar.setAttribute("tabindex", bar === current ? "0" : "-1"));
    });
  });

  document.querySelectorAll<HTMLInputElement>("input[name='office']").forEach((radio) => {
    radio.checked = radio.value === state.office;
  });
  if (sinceInput && sinceOutput) {
    sinceInput.value = String(state.since);
    sinceOutput.value = String(state.since);
  }
  if (languageLink) {
    languageLink.search = location.search;
  }
};

form?.addEventListener("submit", (event) => {
  event.preventDefault();
  const values = new FormData(form);
  state = {
    office: values.get("office") === "government" ? "government" : "state",
    since: parseSince(String(values.get("since"))),
  };
  const url = new URL(location.href);
  url.searchParams.delete("office");
  url.searchParams.delete("since");
  if (state.office !== "state") {
    url.searchParams.set("office", state.office);
  }
  if (state.since !== minYear) {
    url.searchParams.set("since", String(state.since));
  }
  history.pushState(null, "", url);
  apply();
});

sinceInput?.addEventListener("input", () => {
  if (sinceOutput) {
    sinceOutput.value = sinceInput.value;
  }
});

document.querySelectorAll<SVGSVGElement>("svg.chart").forEach((chart) => {
  chart.addEventListener("keydown", onKeydown);
  chart.addEventListener("click", (event) => {
    if (event.target instanceof SVGRectElement && event.target.classList.contains("bar")) {
      showDetail(event.target);
    }
  });
});

addEventListener("popstate", () => {
  state = readState();
  apply();
});

filters?.removeAttribute("hidden");
apply();
