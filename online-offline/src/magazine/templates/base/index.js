// online//offline — Magazine Template Index
// Maps template names to components for use by the generation pipeline.
// Import this file in the generation pipeline to access all templates.

// NOTE: These are browser-standalone JSX files loaded via script tags in the preview HTML.
// When the generation pipeline is built (Puppeteer/Node), these will be
// refactored into proper ES module React components. This index serves as
// the canonical reference for what templates exist and what they are called.

// ─── ACTIVE TEMPLATES ────────────────────────────────────────────────────────

// Structure
// CoverA            — front cover, typographic
// FrontMatter       — page 2, curator attribution + table of contents
// ColophonPage      — back matter, contributor credits + print info

// Visual spreads (Photography / Art)
// SpreadPanorama    — 1 image, full bleed both pages, minimal caption band
// Spread            — 1 image, full bleed left + generous text right (long caption)
// Spread2           — 2 images stacked left + indexed captions right
// Spread4           — 4 images grid left + caption grid right
// SpreadMosaic      — 5–6 images integrated across both pages, light background
// Spread6           — 6–8 images grid across both pages, dark, image-dominant

// Text submissions
// TextSubmission    — single page essay/short text (≤500 words)
// TextSpread        — two page essay (501–1800 words, truncated above 1800)
// PoetryPage        — single page poetry, narrow centered column, stanza breaks

// Collaborations
// CollabSpreadCommunity  — two page, open global collab
// CollabSpreadLocal      — two page, city-specific collab, city as design element
// CollabSpreadPrivate    — two page, invite-only collab, fully dark

// Communications + Campaigns
// CommunicationsPage — single page, 2-column message card grid
// CampaignPage       — single page, full-bleed ad with price reduction hero

// ─── DEPRECATED (retained for reference, not used in generation pipeline) ────
// SinglePhoto        — replaced by SpreadPanorama / Spread
// MultiPhoto2Stacked — replaced by Spread2
// MultiPhoto2SideBySide — replaced by Spread2
// MultiPhoto4Feature — replaced by Spread4
// MultiPhoto4Grid    — replaced by Spread4
// CollabPage         — replaced by CollabSpreadCommunity/Local/Private
// MusicPage          — music is not a content type; musicians participate through Photography, Art, Essay, or Poetry

// ─── SELECTION LOGIC ─────────────────────────────────────────────────────────
// See SELECTION_LOGIC.md in this directory for the full decision tree.
// Summary:
//
// Photography / Art:
//   1 image, caption ≤50 words  → SpreadPanorama
//   1 image, caption >50 words  → Spread
//   2 images                    → Spread2
//   3–4 images                  → Spread4
//   5–6 images                  → SpreadMosaic
//   7–8 images                  → Spread6
//
// Essay:
//   ≤500 words                  → TextSubmission
//   501–1800 words              → TextSpread
//   >1800 words                 → TextSpread (truncated)
//
// Poetry (auto-detected):        → PoetryPage
//
// Collaborations:
//   mode === 'community'         → CollabSpreadCommunity
//   mode === 'local'             → CollabSpreadLocal
//   mode === 'private'           → CollabSpreadPrivate
//
// Communications:                → CommunicationsPage (one shared page)
// Campaigns:                     → CampaignPage (one page per campaign)
