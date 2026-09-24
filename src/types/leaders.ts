export type Lang = "en" | "ja";

export type Role = "head_of_state" | "head_of_government";

export type Holder = {
  id: number;
  name_en: string;
  name_ja: string;
  start: string;
  end: string | null;
  acting: boolean;
  wikipedia: { en: string | null; ja: string | null };
};

export type Office = {
  role: Role;
  title_en: string;
  title_ja: string;
  holders: Holder[];
};

export type Country = {
  id: string;
  name_en: string;
  name_ja: string;
  name_kana: string;
  display_from: string;
  offices: Office[];
};

export type HolderDetail = {
  start: string;
  end: string | null;
  acting: boolean;
  name: string;
  office: string;
  term: string;
  days: string;
  url: string | null;
  urlLang: Lang;
  linkLabel: string;
  portraitAlt: string;
};

export type ClientData = {
  asOf: string;
  periodStart: string;
  defaultSince: number;
  endYear: number;
  labels: Record<
    "acting" | "daysInOffice" | "nextTerm" | "office" | "previousTerm" | "status" | "term",
    string
  >;
  holders: HolderDetail[];
};
