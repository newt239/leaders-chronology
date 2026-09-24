# leaders-chronology

A static site showing the terms of heads of state and government as horizontal bars. Built with Deno and Lume, it outputs `/` in English and `/ja/` in Japanese.

## Commands

- `deno task serve` / `deno task build`
- `deno task codecheck` - always run after making changes

## Rules

- Take dependencies from JSR where possible. Do not relax `minimumDependencyAge`
- Do not import `lib/leaders.ts` or `@libs/i18n` from the client script
- Keep UI text in the dictionaries under `src/i18n/`. No explanatory copy and no parenthetical notes
- Serif type on a monochrome palette. Do not add colors
- Keep WCAG 2.2 AA and Lighthouse at 100. Interactive targets must be at least 24px
- The OG images in `src/og/*.png` are pre-generated. Regenerate them when their text changes
- Avoid `any`, type assertions, `interface`, unnecessary comments and over-abstraction
- Write commit messages in English on one line, one purpose per commit
