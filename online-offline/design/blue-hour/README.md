# Blue Hour — Claude Design template set (unpacked source)

Unpacked from the Claude Design export `online-offline Blue Hour Template.html`
(the export bundles React, ReactDOM and Babel inline; this folder is just the
issue's own code, in load order). Open `index.html` in a browser to preview all
states (loads React/Babel from unpkg).

Load order matters — each file reads the previous ones' exports from `window`:

| file | contents |
|---|---|
| 00-theme-primitives-batch1.jsx | THEME, page constants, shared primitives (PageRoot, TopBar, Folio, Photo, …), style sheet page, Cover, SpreadPanorama, Spread2, Spread4, sample data |
| 01-shared-marks.jsx | extra marks + helpers for batches 2–5 (Line, Ripple, Wave, Portal, Blinds, Moon, Marquee, …, Body, NameLine, Key, FrameLabel, wordCount, rowCells) |
| 02-sample-text.js | sample essay / poem / letters / names — sample data only, no component reads it |
| 03-batch2-mosaic-spread6-spread.jsx | SpreadMosaic, Spread6, Spread |
| 04-batch3-text-poetry-letters.jsx | TextSubmission, TextSpread, PoetryPage, CommunicationsPage (+ LetterWindow) |
| 05-batch4-collabs.jsx | CollabSpreadCommunity, CollabSpreadLocal, CollabSpreadPrivate |
| 06-batch5-frontmatter-endpaper-colophon.jsx | FrontMatter, Endpaper, ColophonPage |

Components are `function Name({ data, theme = THEME })`, exported with
`Object.assign(window, {...})`. Data shapes follow the kit catalogue
(`claude/claude-design-kit.md`), NOT the generator's real keys — the port maps them.
Fonts: IBM Plex Mono, Lexend Zetta, Spectral via `THEME.fontCss` (Google Fonts @import).
