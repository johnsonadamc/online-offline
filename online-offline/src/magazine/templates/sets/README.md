# Template sets

A template set restyles some magazine templates for an issue without touching `templates/base/`.
Base stays exactly as it is. A set is loaded alongside it and wins by name. Any template the set does
not provide renders from base. The loader is `src/magazine/core/templateSets.ts`, and the splice
happens in `buildPageHtml` in `src/magazine/core/generator.ts`.

## Folder

```
src/magazine/templates/sets/<name>/
  manifest.ts      default-exports a TemplateSetManifest
  *.jsx            the set's components, listed in manifest.files
```

## Manifest (`TemplateSetManifest`)

| Field | Required | Meaning |
|---|---|---|
| `name` | yes | the set's name (same as the folder) |
| `provides` | yes | **pipeline** template names this set renders, e.g. `['CoverA', 'SpreadPanorama']`. A name the pipeline never renders logs a warning and is ignored (not an error). |
| `files` | yes | `.jsx` files, relative to the folder, concatenated in this order. A missing file is an error. |
| `fontCss` | no | CSS injected as `<style>…</style>` right after the base Google Fonts `<link>`, e.g. a Google Fonts `@import`. The renderer waits for `networkidle0` and `document.fonts.ready`. |
| `nameMap` | no | kit component name → pipeline name, e.g. `{ Cover: 'CoverA' }`. The loader appends `Object.assign(window, { CoverA: window.Cover })` inside the IIFE. |
| `adapt` | no | `(templateName, data) => data`, run on the Node side before the page data is serialised, **only for names in `provides`**. Use it to map the pipeline's data shape (`docs/TEMPLATE_CONTRACT.md`) onto the set's. |

## How it is loaded

Each page is ONE `<script type="text/babel">` block. It contains `primitives.jsx`, the printer-marks
override, the base `.jsx` file for the requested template, **then the set**, then the bootstrap. The
bootstrap is `const _Component = window[templateName]` followed by the React render. The set code is
wrapped as:

```js
(function(){
<manifest.files, concatenated>
<nameMap aliases>
})();
```

- **Why not a second `<script>` block:** the bootstrap runs at the end of the first block, so a later
  block would register its component after the lookup had already happened.
- **Why the IIFE:** base templates resolve primitives (`Folio`, `ImageFrame`, `C`, `F`, `AW`…) as
  global bindings. A top-level `function Folio` in a set would replace them for every base template
  on the page. Inside the IIFE the set still *reads* every primitive and constant, but its own
  declarations stay private.
- **No set active ⇒ the page HTML is byte-identical to the pipeline without sets.**

## Activation

`scripts/test-generator.ts --set=<name>` > `periods.template_set_name` > base. `null`, `''` and
`'base'` all mean base, so `--set=base` forces base even if the period names a set. The column's
migration is `scripts/migrations/2026-09-27-periods-template-set-name.sql`. The admin preview route
does not load sets yet.

## Rules — a set MUST NOT

- change `W`, `H`, `BLEED`, `SAFE_INSET`, `AW`/`AH`, the page size, or any print-profile or bleed geometry.
  The design canvas is 790×1054 per page and 1580×1054 per spread, and the screenshot clip assumes it.
- make a single-page template render as a spread or vice versa (`SPREAD_TEMPLATES` in `generator.ts`
  and `pageCount` in `selectionLogic.ts` decide that).
- change selection: which template a submission gets, thresholds, ordering, page numbers. A set only
  changes how a page *looks*.
- publish anything except through its own `Object.assign(window, { … })`, or rely on a top-level
  declaration leaking out of the IIFE.
- truncate contributor text with `clampWords`-style cuts. The app has no caption cap, so a clamp
  silently drops printed words. Design for the real lengths in `scripts/fixtures/`, or
  shrink/flow, and flag overflow instead.

## A set MUST

- give every spread's gutter-shadow element `className="gutter-shadow"`. The magcloud profile hides it by
  that class, and without the class it prints as a dark sliver at the fold.
- keep meaning-carrying text ≥ `SAFE_INSET` (16 px) inside the design trim and out of the fold band.
- render at the same root size as base (`AW×AH` or `2·AW×AH`) with `overflow: hidden`.

## Verifying a set

- **Byte-identical base:** with no set, hash `buildPageHtml` for every page in `scripts/fixtures/*.json`
  and compare with the previous commit.
- **Override:** render a provided template with the set and one it does not provide. The first shows the
  set, the second shows base unchanged, with base `Folio` text present.
- **Page counts:** a set cannot change them, because selection is untouched. `generate-test --set=<name>`
  must log the same "total pages" as without it.
