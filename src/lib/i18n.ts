import { i18n } from "@libs/i18n";
import { en } from "#/i18n/en.ts";
import { ja } from "#/i18n/ja.ts";

import type { Lang } from "#/types/leaders.ts";

i18n.for("en").set(en);
i18n.for("ja").set(ja);

export const languages: Record<Lang, { path: string; name: string }> = {
  en: { name: "English", path: "/" },
  ja: { name: "日本語", path: "/ja/" },
};

export const translator = (lang: Lang) => i18n.for(lang, { timezone: "UTC" });
