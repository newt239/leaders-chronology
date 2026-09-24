const DAY_MS = 86_400_000;
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

const parts = (iso: string) => {
  const match = ISO_DATE.exec(iso);
  if (!match) {
    return null;
  }
  const [, y, m, d] = match;
  const year = Number(y);
  const month = Number(m);
  const day = Number(d);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    return null;
  }
  return { day, month, year };
};

export const isIsoDate = (iso: string) => parts(iso) !== null;

export const toDay = (iso: string) => {
  const p = parts(iso);
  if (!p) {
    throw new Error(`Invalid date: ${iso}`);
  }
  return Date.UTC(p.year, p.month - 1, p.day) / DAY_MS;
};
