import { toDay } from "#/lib/date.ts";

export const layout = {
  axisHeight: 32,
  barGap: 2,
  barHeight: 24,
  labelWidth: 140,
  minBarWidth: 3,
  plotWidth: 1000,
  rightPad: 24,
  rowHeight: 36,
};

export type Scale = { from: number; to: number; xOf: (day: number) => number };

export const createScale = (year: number, periodStart: string, asOf: string): Scale => {
  const from = Math.max(toDay(`${year}-01-01`), toDay(periodStart));
  const to = toDay(asOf);
  const ratio = layout.plotWidth / (to - from);
  return { from, to, xOf: (day) => layout.labelWidth + (day - from) * ratio };
};

export const barGeometry = (start: number, end: number, visibleFrom: number, scale: Scale) => {
  const s = Math.max(start, visibleFrom, scale.from);
  const e = Math.min(end, scale.to);
  if (e < s || (e === s && end > start)) {
    return null;
  }
  const x = scale.xOf(s);
  return { width: Math.max(scale.xOf(e) - x - layout.barGap, layout.minBarWidth), x };
};

export const ticks = (scale: Scale) => {
  const firstYear = new Date(scale.from * 86_400_000).getUTCFullYear();
  const lastYear = new Date(scale.to * 86_400_000).getUTCFullYear();
  const span = lastYear - firstYear;
  const step = span > 50 ? 10 : span > 20 ? 5 : span > 10 ? 2 : 1;
  const result: { x: number; year: number }[] = [];
  for (let year = Math.ceil(firstYear / step) * step; year <= lastYear; year += step) {
    const day = toDay(`${year}-01-01`);
    if (day >= scale.from) {
      result.push({ x: scale.xOf(day), year });
    }
  }
  return result;
};
