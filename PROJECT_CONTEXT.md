# PROJECT_CONTEXT.md — online//offline

## What This Is

online//offline is a **slowcial media platform** — a direct, deliberate counterpoint to dopamine-driven social media. It is not trying to compete with Instagram, Substack, or any existing platform. It occupies a different category entirely.

The core proposition: contributors submit creative work quarterly. Curators select what goes into their personalized printed magazines. The physical magazine is the product. The app is the infrastructure that makes it possible.

The pace is intentional. Quarterly submissions, printed artifacts, real editorial curation. The platform rewards patience and deliberateness — qualities that every other platform has engineered out of existence.

---

## The Printed Magazine as Product

The magazine is not a metaphor or a feature — it is the literal output of the system. Everything in the app exists to make the magazine possible:

- Contributors submit because their work might be selected and printed
- Curators engage because they are making something real and physical
- Collaborations produce collective pages in the printed edition
- Communications between contributors and curators inform editorial decisions

This distinction matters for every product decision. The app should feel like **infrastructure for a print publication**, not a social platform that happens to print things. It should feel calm, considered, and purposeful — like a well-designed editorial tool, not a feed.

---

## Design Philosophy

The aesthetic references: a **print shop at dusk**, proof light tables, letterpress type, registration marks, neon-lit darkrooms.

The single rule: every UI element participates in the neon color system or recedes into the warm dark. Nothing is neutral gray. Nothing is pure white. Nothing is default blue.

The app is warm, considered, and slightly industrial. Not tech. Not startup. Print culture, digitized.

This matters beyond aesthetics — the design communicates to users that this is a serious creative platform, not another content mill. The deliberate darkness, the serif type, the grain texture, the registration marks: these signal that what happens here has weight.

---

## User Experience Principles

These principles should guide every product and design decision:

1. **Focus on participation** — prioritize calls to action that encourage participation in existing activities over creating new ones

2. **Simplify primary actions** — make the most important action on any screen immediately obvious and accessible

3. **Provide visual feedback** — use subtle color changes and the neon system to indicate state changes; never leave the user wondering if something worked

4. **Reduce cognitive load** — break complex tasks into simpler steps; use progressive disclosure to reveal details as needed

5. **Maintain context** — users should always know where they are in a process and how to get back

6. **Prioritize content** — content should be the focus; UI elements support rather than distract

7. **Implicit default states** — do not explicitly label draft status; assume it as default. Only show explicit labels for submitted or published content

8. **Consistent icon color coding** — community=blue, local=green, private=purple, everywhere, always

9. **Mobile-first** — primary usage is expected on phones; design for thumb reach and one-handed use before considering desktop

10. **No flashy animations** — the app should feel calm and purposeful, not stimulating. Transitions should be functional, not decorative. The press mechanic button is the exception — it's a deliberate nod to print culture physicality

---

## The Quarterly Rhythm

The platform runs on quarterly periods (seasons). This is a feature, not a limitation. It means:

- Contributions have a deadline, which gives them weight
- Curators make selections under time pressure, which makes curation feel real
- The magazine has an edition structure, which makes each issue distinct
- Contributors know when to expect their work to appear in print

The countdown timer on the dashboard is intentional — it creates gentle urgency without being stressful. Days remaining, not hours and minutes.

---

## Contributor and Curator Roles

**Contributors** are the creative engine. They submit photos, art, poetry, essays, music. They join collaborations. They send private communications to curators they want to work with. They are not passive content producers — they are active participants in a creative community.

**Curators** are the editorial voice. They select which contributors, collaborations, communications, and campaigns appear in their personalized edition. Each curator's magazine is different. The curation interface (the "proof light table") is where this happens — it should feel like a serious editorial tool.

**Users can be both.** This is common and should be fully supported. The dashboard's Contribute/Curate tab structure reflects this.

---

## Collaboration System Philosophy

Collaborations are not just a feature — they are one of the three main ways content enters the magazine (alongside individual submissions and communications).

The three participation modes reflect different social dynamics:

- **Community** — open to everyone, globally. Creates a sense of shared project across the whole platform. The magazine page shows a random selection, creating variety.

- **Local** — city-specific. Creates genuine geographic communities. Contributors in Pensacola see work from other Pensacola contributors. This is intentional — the platform should have local texture, not just be a global content pool.

- **Private** — invite-only. Creates intimate creative circles. The private collab page is identical for all members — it's a shared artifact, not a personalized selection.

---

## Magazine Generation — Research and Approach

### The Decision: Web-to-Print, Not InDesign

Early planning considered Adobe InDesign with scripted data merge as the generation approach. This was rejected for several reasons:
- InDesign requires manual intervention and doesn't scale to variable data printing per curator
- The scripting approach is brittle and requires InDesign licenses
- A web-based approach keeps everything in the existing stack

**The chosen approach: React components → Puppeteer → PDF.**

React components ARE the page templates. The browser IS the preview system. Puppeteer renders them to print-ready PDFs. This means:
- Curators can preview their magazine in the browser before it goes to print
- Templates are maintainable by anyone who knows React
- The pipeline is fully automated and scalable
- No external design software required

### Print Specifications
- Target output: single PDF per curator, per period
- Print-on-demand services handle RGB→CMYK conversion (no need to output CMYK)
- Bleed and crop marks required for professional print
- Target magazine size: TBD (likely A5 or 8.5×11)
- Page count: up to 20 pages per curator (the slot limit in the curation interface)

### Print Fulfillment Research
Three services evaluated:

**Mixam** — preferred option
- Has a developer API for automated order submission
- Supports variable data (different content per copy)
- Good quality, reasonable pricing
- UK-based but ships internationally

**Magcloud** (HP)
- No automation API — manual upload required
- Good for early stage before automation is needed
- PDF upload workflow is straightforward

**Newspaper Club**
- Strong aesthetic fit — editorial, print-culture feel
- Limited automation
- Better for newspaper format than magazine

**Recommendation:** Start with Magcloud for the first season (manual upload, no API integration needed). Build toward Mixam API integration for automation once the generation pipeline is stable.

### Page Template Types Required
Each template type is a React component that receives content data and renders a print-ready page:

1. **Individual creator page** — one creator's submission, 1–8 images with titles and captions. The feature image gets prominent placement. Layout varies based on image count.

2. **Collaboration grid** — 8–10 pieces from collab contributors. Random selection for community/local collabs, all pieces for private. Multiple layout variants for visual variety.

3. **Communications page** — text-heavy. The curator's selected communications from contributors. Editorial, letterpress aesthetic.

4. **Campaign/ad page** — sponsor content. Clean, designed. The $2 discount per ad selected in the curation interface reflects the economics of the print run.

5. **Cover** — TBD. Likely curator-specific with the season, period name, and a selected image.

### Content Mapping Logic
The pipeline must map curator selections to page templates:

```
curator_creator_selections → Individual creator pages (one per selected creator)
curator_collab_selections  → Collaboration grid pages (one per selected collab)
curator_communication_selections → Communications page (one page, all selected comms)
curator_campaign_selections → Ad pages (one per selected campaign)
```

The frame naming convention within templates must be consistent — the mapper needs to know where `image_1`, `caption_1`, `title_1` etc. go in each template variant.

---

## Pricing Model (Early Thinking)

The base magazine price to the curator is $25.00 per issue. Each ad campaign selected reduces the price by $2.00 (shown live in the curation interface). This creates a natural incentive for curators to include relevant campaigns.

The actual print cost per copy from the fulfillment service will determine margin. At scale, the economics improve. For early stage, the priority is proving the model works, not optimizing margin.

---

## Go-to-Market Notes

**The platform is not yet open to real users.** Development is in progress with three test accounts. When ready to launch:

- Target first users: photographers, essayists, poets, visual artists who are dissatisfied with existing platforms
- The physical magazine is the hook — "your work, printed" is a compelling pitch that no other platform offers
- Local collab feature creates geographic community texture that makes the platform feel personal
- Curator role is the editorial/curation-minded user who wants to make something rather than just consume

**The name:** online//offline — the `//` separator is intentional. It represents the translation between digital submission and physical print. The separator in the wordmark is rendered in `--paper-5` (the most muted text color) to be present but not prominent.

---

## What This Is Not

- Not a social feed. There is no algorithmic timeline, no likes, no follower counts visible to contributors.
- Not a content marketplace. Contributors don't sell their work directly.
- Not a newsletter platform. The output is a physical magazine, not email.
- Not Instagram for print. The deliberate pace and editorial layer are the product, not just the output format.

The clearest one-line description: **a curated, modular, printed social magazine — made quarterly, one per curator, from contributed creative work.**