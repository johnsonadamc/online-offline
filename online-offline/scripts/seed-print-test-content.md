# Seed Content — Spring 2026 Print Test
### online//offline — complete text layer + image mapping

**Purpose:** Populate the Spring 2026 period with realistic content that fires every template, so two curators can generate two distinct print-ready magazines.

**Period:** Spring 2026 · `aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa`
**Bucket base URL:** `https://cbdiujvqpirrvzodfujm.supabase.co/storage/v1/object/public/<BUCKET>/seed/<filename>`
⚠️ Replace `<BUCKET>` once confirmed. Bucket must be **public** or Puppeteer renders empty frames.

---

## 1. Template Coverage Check

| Template | Fired by | Pages |
|---|---|---|
| CoverA | auto | 1 |
| BlankPage | auto | 1 |
| FrontMatter | auto | 1 |
| SpreadPanorama | "The Salt Line" (1 img, ≤50w) | 2 |
| Spread | "What the Tide Left" (1 img, >50w) | 2 |
| Spread2 | "Two Mornings" (2 img) | 2 |
| Spread4 | "Paper Studies" (3 img) | 2 |
| SpreadMosaic | "Neighborhood Index" (5 img) | 2 |
| Spread6 | "Field Notes" (7 img) | 2 |
| TextSubmission | "The Slow Channel" (≤500w) | 1 |
| TextSpread | "Against the Feed" (~900w) | 2 |
| PoetryPage | "Inventory of a Rented Room" | 1 |
| CollabSpreadCommunity | "Somewhere Else Entirely" | 2 |
| CollabSpreadLocal | "The Water Is Always There" | 2 |
| CollabSpreadPrivate | "Everyone Who Was There" | 2 |
| CommunicationsPage | auto | 1 |
| CampaignPage | ×2 per curator | 2 |
| ColophonPage | auto | 1 |

**Curator A total: ~30 pages. Curator B: ~28 pages.** Both land near the 38–40 target once collabs and campaigns stack.

---

## 2. Contributor Roster (existing UUIDs — no new accounts)

| Name | UUID | content_type | City |
|---|---|---|---|
| Maya Torres | `0889833d-d56a-4969-83b4-43c9585bcd92` | photography | Pensacola |
| Sarah Chen | `11111111-1111-1111-1111-111111111111` | photography | Portland |
| James Wilson | `22222222-2222-2222-2222-222222222222` | photography | Chicago |
| Maya Patel | `33333333-3333-3333-3333-333333333333` | art | Austin |
| Carlos Rodriguez | `44444444-4444-4444-4444-444444444444` | photography | New Orleans |
| Emma Zhang | `55555555-5555-5555-5555-555555555555` | art | Seattle |
| David Okafor | `66666666-6666-6666-6666-666666666666` | photography | Atlanta |
| Leila Hassan | `77777777-7777-7777-7777-777777777777` | essay | New York |
| Tomas Reyes | `88888888-8888-8888-8888-888888888888` | photography | San Antonio |
| Daniel Osei | `402f2415-65c1-4efa-a95e-c0ccb38f7048` | essay | Boston |
| Olivia Martinez | `cccccccc-cccc-cccc-cccc-cccccccccccc` | poetry | Miami |
| Kai Tanaka | `dddddddd-dddd-dddd-dddd-dddddddddddd` | photography | San Francisco |
| Zoe Williams | `eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee` | art | Denver |
| Miguel Garcia | `ffffffff-ffff-ffff-ffff-ffffffffffff` | photography | Phoenix |
| Aisha Johnson | `11111111-2222-3333-4444-555555555555` | essay | Philadelphia |
| Benjamin Lee | `22222222-3333-4444-5555-666666666666` | poetry | Nashville |
| Fatima Al-Sayegh | `33333333-4444-5555-6666-777777777777` | photography | Houston |
| Gabriel Moreno | `44444444-5555-6666-7777-888888888888` | art | Los Angeles |
| Helena Novak | `55555555-6666-7777-8888-999999999999` | photography | Boston |

**Curators:** Lena Vasquez `185f8c7c-9837-425a-ac1c-ebf18d1af1b9` (A) · Adam Johnson `2ad6af92-279d-4eb7-a1b6-b51ec042aa85` (B — already has curator role)

### Bios (profiles.bio)

- **Maya Torres** — Photographer working in available light along the Gulf Coast. Interested in the hour before things open.
- **Sarah Chen** — Documents shorelines and the objects they surrender. Based in Portland, raised near water.
- **James Wilson** — Makes pictures of ordinary rooms at consistent intervals. Believes repetition is a form of attention.
- **Maya Patel** — Works in paper, pigment, and pressure. Studio practice built around what a single sheet can hold.
- **Carlos Rodriguez** — Photographs the four blocks around his apartment and nothing else. Ten years so far.
- **Emma Zhang** — Mixed-media artist assembling field observations into visual notation.
- **David Okafor** — Street photographer, Atlanta. Prefers overcast.
- **Leila Hassan** — Essayist writing on attention, technology, and the economics of slowness.
- **Tomas Reyes** — Photographs work sites, loading docks, and the people who keep them running.
- **Daniel Osei** — Writer. Interested in what gets lost between the draft and the post.
- **Olivia Martinez** — Poet. Short lines, rented rooms, Miami humidity.
- **Kai Tanaka** — Photographer documenting transitional architecture in the Bay Area.
- **Zoe Williams** — Painter and collagist working from Denver. Makes things that resist reproduction.
- **Miguel Garcia** — Desert light, long exposures, Phoenix.
- **Aisha Johnson** — Essayist and cultural critic writing about art, technology, and permanence.
- **Benjamin Lee** — Poet and visual artist exploring themes of memory and identity.
- **Fatima Al-Sayegh** — Photographs interiors after the people leave.
- **Gabriel Moreno** — Assemblage artist, Los Angeles. Found objects, fixed frames.
- **Helena Novak** — Photographer. Winter light, Boston, patience.

---

## 3. Visual Submissions

### 3.1 "The Salt Line" — SpreadPanorama
**Contributor:** Maya Torres · **Type:** Photography · **content.type:** `regular`
**page_title:** `The Salt Line`
**Image:** `panorama-01.jpg` · order_index 0 · focal 50/50 · is_feature true

**entry.title:** `Low Tide, Facing East`
**entry.caption** *(38 words — under the 50 limit, fires SpreadPanorama)*:
> The line the water leaves is never the same twice, but it is always a line. I have photographed it for six years and it has never once been straight.

---

### 3.2 "What the Tide Left" — Spread
**Contributor:** Sarah Chen · **Type:** Photography · **content.type:** `regular`
**page_title:** `What the Tide Left`
**Image:** `spread-01.jpg` · order_index 0 · focal 50/45 · is_feature true

**entry.title:** `Inventory, Morning After`
**entry.caption** *(112 words — over 50, fires Spread)*:
> My grandmother collected what the water gave back. Bottle glass worn soft, a doll's arm, once a wedding ring with no name inside it. She kept everything in a coffee tin on the windowsill and never explained the system, if there was one. When she died we found the tin exactly where it had always been, and none of us could throw it out, and none of us could say why. I photograph the shoreline now the way she walked it — slowly, without a plan, looking down. This is what was there on a Tuesday. It is not important. That is precisely the point, and I have stopped apologizing for it.

---

### 3.3 "Two Mornings" — Spread2
**Contributor:** James Wilson · **Type:** Photography · **content.type:** `regular`
**page_title:** `Two Mornings`

| Image | order_index | focal | is_feature | entry.title | entry.caption |
|---|---|---|---|---|---|
| `two-01.jpg` | 0 | 50/40 | true | `Tuesday, 6:14` | Same chair, same window, eleven degrees colder than the day before. |
| `two-02.jpg` | 1 | 50/40 | false | `Wednesday, 6:11` | Three minutes earlier. The difference is the whole photograph. |

---

### 3.4 "Paper Studies" — Spread4
**Contributor:** Maya Patel · **Type:** Art · **content.type:** `regular`
**page_title:** `Paper Studies`

| Image | order_index | focal | is_feature | entry.title | entry.caption |
|---|---|---|---|---|---|
| `four-01.jpg` | 0 | 50/50 | true | `Study I — Fold` | A single sheet, folded until it refused. |
| `four-02.jpg` | 1 | 50/50 | false | `Study II — Weight` | What the paper does when you stop helping it. |
| `four-03.jpg` | 2 | 50/50 | false | `Study III — Return` | Unfolded. The creases are the record. |

---

### 3.5 "Neighborhood Index" — SpreadMosaic
**Contributor:** Carlos Rodriguez · **Type:** Photography · **content.type:** `regular`
**page_title:** `Neighborhood Index`

| Image | order_index | focal | is_feature | entry.title | entry.caption |
|---|---|---|---|---|---|
| `mosaic-01.jpg` | 0 | 50/50 | true | `Corner, North` | The same corner, the ninth year. |
| `mosaic-02.jpg` | 1 | 50/50 | false | `Fence` | It was blue when I moved here. |
| `mosaic-03.jpg` | 2 | 50/50 | false | `Afternoon` | Nobody home. Nobody ever home at this hour. |
| `mosaic-04.jpg` | 3 | 50/50 | false | `Utility` | Somebody's job to paint that number. |
| `mosaic-05.jpg` | 4 | 50/50 | false | `Corner, South` | Four blocks is enough. It has always been enough. |

---

### 3.6 "Field Notes" — Spread6
**Contributor:** Emma Zhang · **Type:** Art · **content.type:** `regular`
**page_title:** `Field Notes`

| Image | order_index | focal | is_feature | entry.title | entry.caption |
|---|---|---|---|---|---|
| `six-01.jpg` | 0 | 50/50 | true | `Note 01` | Begin anywhere. |
| `six-02.jpg` | 1 | 50/50 | false | `Note 02` | Collected, not composed. |
| `six-03.jpg` | 2 | 50/50 | false | `Note 03` | The order arrived later. |
| `six-04.jpg` | 3 | 50/50 | false | `Note 04` | Kept because it wouldn't resolve. |
| `six-05.jpg` | 4 | 50/50 | false | `Note 05` | Out of sequence on purpose. |
| `six-06.jpg` | 5 | 50/50 | false | `Note 06` | Nearly discarded twice. |
| `six-07.jpg` | 6 | 50/50 | false | `Note 07` | End anywhere. |

---

## 4. Text Submissions

### 4.1 "The Slow Channel" — TextSubmission (≤500w)
**Contributor:** Daniel Osei · **Type:** Essay · **page_title:** `The Slow Channel`
**Word count: ~440** ✅ fires TextSubmission

> My father wrote letters. Not as a practice or a statement — there simply wasn't another way, and by the time there was, he had gotten used to the shape of it.
>
> I have most of them. They are not interesting. He describes weather, the state of a car he no longer owns, a dispute with a neighbor about a tree. He asks questions and then, because the answers were six weeks out, he answers them himself, badly, and the next letter corrects the guess. Reading them in order is like watching someone think slowly in public.
>
> What strikes me now is not the content but the drag. Every letter had to survive the gap. He had six weeks to decide whether a sentence was worth the stamp, and the ones that made it through had been sanded down by waiting. There is nothing in that box he regretted sending. I cannot say the same about a single week of my own outgoing messages.
>
> The argument for slowness usually arrives as an argument against speed, which is why nobody listens to it. Speed is not the enemy. Speed is extraordinary. The problem is that speed removed the gap, and the gap was doing work nobody had bothered to name — it was the part of the process where you found out whether you actually meant it.
>
> We have replaced the gap with volume. This is not a trade anyone consciously made. It happened the way most things happen, one convenient decision at a time, and now I produce more sentences in a morning than my father produced in a decade, and I would not defend one of them in a box someone opens in forty years.
>
> I am not proposing we go back. I don't want the six weeks. I want the sanding.
>
> The interesting question is whether the drag can be manufactured — whether you can install a gap on purpose, artificially, and get the same result. My instinct is no. My father's patience wasn't a virtue; it was infrastructure. He wasn't waiting because waiting was good for him. He was waiting because the mail was slow.
>
> But I keep the box on the shelf where I can see it, which is its own kind of argument, and every so often I write something and don't send it, and watch what happens to it overnight.
>
> Usually it dies. That is the point.

---

### 4.2 "Against the Feed" — TextSpread (501–1800w)
**Contributor:** Leila Hassan · **Type:** Essay · **page_title:** `Against the Feed`
**Word count: ~910** ✅ fires TextSpread

> There is a particular sound a magazine makes when you drop it on a table. It is not a good sound or a bad sound. It is a sound that means something arrived and is now here, in the room, taking up space, and will continue taking up space until somebody deals with it.
>
> Nothing on my phone makes that sound. Nothing on my phone takes up space. This is presented as the central achievement of the last twenty years and I have come to believe it is the central problem.
>
> Consider what it costs to publish a photograph. Online: nothing. Not approximately nothing — actually nothing, to a rounding error, forever, at infinite scale. In print: paper, ink, a press, a person who decides, a person who ships, and a hard edge at page forty where the thing simply stops. The online photograph is free and therefore weightless. The printed photograph cost something and therefore has to be worth something, and somebody had to decide it was, and that decision is legible on the page in a way that no amount of engagement metrics can reproduce.
>
> This is not nostalgia. I am not arguing that print is better. I am arguing that scarcity is a mechanism, and we removed it without building a replacement, and the thing it was doing turns out to have been most of the value.
>
> The feed's fundamental promise is that nothing ever has to end. There is always another. This sounds like abundance and is actually a kind of poverty, because a thing that never ends can never be finished, and a thing that can never be finished can never be considered. You cannot contemplate a river. You can only stand in it.
>
> What a magazine does — what any bounded object does — is stop. It has a last page. The last page is not a limitation of the format; it is the format's entire argument. It says: this much, and no more, and somebody chose. Everything inside those covers was chosen against everything that could have been there instead. That's what makes it worth your attention. Not that it's good, necessarily. That it's *finite*, and the finitude implies a choosing, and the choosing implies a person.
>
> The counterargument is obvious and I want to take it seriously: gatekeeping. Scarcity in publishing has historically meant a small number of people deciding what a large number of people were allowed to see, and those people were, overwhelmingly, the same kind of person. The feed broke that, genuinely, and the breaking was good. I am not interested in restoring the gate.
>
> But there is a difference between removing the gatekeeper and removing the gate. What we built instead is not an absence of curation — it is curation performed by a system optimizing for time spent, which is to say curation by an entity with a financial interest in your never being satisfied. We didn't democratize the decision. We automated it, and handed it to something that does not want what you want.
>
> The alternative I'm interested in is not fewer gatekeepers but *more* of them — everyone their own editor, everyone assembling their own bounded object, everyone forced by the physical limits of paper to say: this and not that. Not because your choices are better than an algorithm's. Because they're *yours*, and you'll remember making them, and the object on your table will be evidence that you did.
>
> There is a version of this that is precious and insufferable and I want to name it before someone else does. The fetishization of the analog is a genuine aesthetic failure — the person who bought a typewriter to be a certain kind of person, the vinyl that never gets played. If the argument for print is that it *feels* better, the argument is worthless. Feelings about objects are cheap and available for purchase.
>
> The argument has to be structural or it isn't an argument. And structurally it's this: the constraint produces the attention. Not the paper. Not the smell. The constraint. Forty pages means somebody had to decide, and deciding is the whole job, and any medium that removes the necessity of deciding has removed the job while keeping the title.
>
> My father used to get a magazine in the mail every month. He read it — all of it, including the parts he didn't care about, because it was there and it was finite and finishing it was possible. He could not do that with the internet. Nobody can do that with the internet. Not because the internet is worse but because it is not a thing, it's a condition, and you don't finish a condition, you just eventually stop.
>
> I would like to finish something. That's all this is. I would like there to be a last page, and to reach it, and to put the thing down on the table and hear the sound it makes.

---

### 4.3 "Inventory of a Rented Room" — PoetryPage
**Contributor:** Olivia Martinez · **Type:** Poetry
**page_title:** `Inventory of a Rented Room`
✅ Poetry detection: short lines (avg <60 chars), 3+ breaks per 100 words, multiple stanza breaks.

> One chair, which is enough.
> One window, which is not.
>
> The landlord painted over the hinges
> so the whole thing opens
> like a decision you regret.
>
> August comes in anyway.
> August does not need the window.
>
> I have a table and a lamp
> and the particular arrangement
> of a person who does not expect
> to be here long,
> and has been here
> four years.
>
> Downstairs, someone's radio.
> Upstairs, someone's floor.
>
> In the drawer: a key
> to an apartment in another city
> that has by now been rented
> to somebody else,
> who found the drawer empty
> and did not wonder.
>
> I am not lonely.
> I am inventoried.
>
> There is a difference
> and I have four years
> to explain it.

---

## 5. Collaborations

> ⚠️ **Image/collab swap:** filenames don't match modes. The seed maps URLs explicitly — no renaming required.
> `collab-local-*.jpg` (Disney) → **Community** · `collab-community-*.jpg` (beach) → **Local** · `collab-private-*.jpg` → **Private**

### 5.1 "Somewhere Else Entirely" — CollabSpreadCommunity
**Mode:** `community` · **type:** `theme` · **template_id:** existing community template
**Images:** `collab-local-01..06.jpg` *(Disney trip)*

**title:** `Somewhere Else Entirely`
**description (public, shown to curators):**
> A shared archive of manufactured wonder. Contributors document the places built specifically to be nowhere near where they live.

**prompt_text / instructions (contributor brief):**
> Photograph a place engineered for delight. Not your delight — anyone's. Look for the seams: the maintenance door, the tired parent, the thing the place is working very hard to make you not notice. Bonus points if the photo is affectionate anyway.

| Image | Contributor | Caption |
|---|---|---|
| `collab-local-01.jpg` | Miguel Garcia | Ninety minutes for four. Worth it, reportedly. |
| `collab-local-02.jpg` | Fatima Al-Sayegh | The castle from the angle nobody photographs. |
| `collab-local-03.jpg` | Tomas Reyes | Someone's whole day, in one frame. |
| `collab-local-04.jpg` | Helena Novak | Manufactured, and it worked anyway. |
| `collab-local-05.jpg` | David Okafor | The parade goes past regardless of who is watching. |
| `collab-local-06.jpg` | Kai Tanaka | Leaving. Everyone leaves eventually. |

---

### 5.2 "The Water Is Always There" — CollabSpreadLocal
**Mode:** `local` · **city:** `Pensacola` · **type:** `theme`
**Images:** `collab-community-01..06.jpg` *(Pensacola beach)*

**title:** `The Water Is Always There`
**description:**
> Pensacola contributors document the Gulf on ordinary days. Not the postcard — the Tuesday.

**prompt_text / instructions:**
> Photograph the water on a day you weren't planning to. No sunsets unless the sunset is incidental. We are interested in what the Gulf looks like when nobody is performing for it.

| Image | Contributor | Caption |
|---|---|---|
| `collab-community-01.jpg` | Maya Torres | Before the parking lot fills. |
| `collab-community-02.jpg` | Adam Johnson | The sand does this on its own. |
| `collab-community-03.jpg` | Maya Torres | Same water. Different Tuesday. |
| `collab-community-04.jpg` | Adam Johnson | Nobody performing. |
| `collab-community-05.jpg` | Maya Torres | The Gulf, unbothered. |
| `collab-community-06.jpg` | Adam Johnson | Still there tomorrow. |

---

### 5.3 "Everyone Who Was There" — CollabSpreadPrivate
**Mode:** `private` · **type:** `narrative` · **cap 8–10**
**Images:** `collab-private-01..06.jpg` *(family, Pensacola)*
**Lead:** Adam Johnson `2ad6af92-279d-4eb7-a1b6-b51ec042aa85` (role `lead`, invite_status `accepted`)
**Members (invite_status `accepted`, so counts show correctly):** Maya Torres, Sarah Chen, Benjamin Lee

**title:** `Everyone Who Was There`
**description:**
> A closed circle documenting the people they'd otherwise only photograph on their phones.

**prompt_text / instructions:**
> Photograph the people you actually know. Not portraits — evidence. The frame should feel like it was taken by someone who was invited. This collab is private and stays private; the page is identical for every member.

| Image | Contributor | Caption |
|---|---|---|
| `collab-private-01.jpg` | Adam Johnson | Nobody arranged this. |
| `collab-private-02.jpg` | Adam Johnson | The good camera stayed in the bag. |
| `collab-private-03.jpg` | Maya Torres | Taken by someone who was invited. |
| `collab-private-04.jpg` | Adam Johnson | Evidence, not portrait. |
| `collab-private-05.jpg` | Sarah Chen | Everyone who was there. |
| `collab-private-06.jpg` | Benjamin Lee | And then it was over. |

---

## 6. Campaigns (4 — `avatar_url` renders FULL-BLEED)

| # | name | discount | avatar_url | bio | last_post |
|---|---|---|---|---|---|
| 1 | Moleskine | 2 | `campaign-01.jpg` | Notebooks for people who still write things down before they mean them. | *Since 1997. Before that, since 1888, depending who you ask.* |
| 2 | Risograph Press Co. | 2 | `campaign-02.jpg` | Small-run printing in impossible colors. Fluorescent pink is not a phase. | *Now booking spring runs.* |
| 3 | Gulf Coast Film Lab | 2 | `campaign-03.jpg` | Develop, scan, mail back. Two weeks, sometimes three. We are not sorry. | *C-41, E-6, black and white by hand.* |
| 4 | The Standing Desk | 2 | `campaign-04.jpg` | Furniture built to outlast the person who bought it. | *Ten-year warranty. Fifty-year intent.* |

**Split:** Curator A → Moleskine + Gulf Coast Film Lab · Curator B → Risograph + The Standing Desk

---

## 7. Communications (CommunicationsPage, max 4 cards)

**→ Curator A (Lena Vasquez):**

| sender | subject | content | word_count |
|---|---|---|---|
| Maya Torres | On the salt line | I've been shooting this same stretch for six years and I still can't tell you why. If it makes the issue, put it early — it's a beginning, not an ending. | 31 |
| Daniel Osei | Re: the essay | Cut it if it runs long. I'd rather be short and land than complete and drift. You have my permission to be ruthless. | 24 |

**→ Curator B (Adam Johnson):**

| sender | subject | content | word_count |
|---|---|---|---|
| Olivia Martinez | About the poem | Four years in the same room and it took me all four to write nine lines about it. Print it small. It wants to be small. | 27 |
| Emma Zhang | Field notes, sequencing | The order doesn't matter. I mean that — if the layout wants a different sequence, take it. The notes were never sequential. | 23 |

`curator_communication_selections.include_communications = true` for both.

---

## 8. Curator Selections

### Curator A — Lena Vasquez `185f8c7c-9837-425a-ac1c-ebf18d1af1b9`

**Contributors (10):** Maya Torres · Sarah Chen · James Wilson · Maya Patel · Carlos Rodriguez · Daniel Osei · Leila Hassan · Olivia Martinez · Emma Zhang · David Okafor
**Collabs (2):** "Somewhere Else Entirely" (community) · "The Water Is Always There" (local, Pensacola)
**Campaigns (2):** Moleskine · Gulf Coast Film Lab
**Communications:** true

### Curator B — Adam Johnson `2ad6af92-279d-4eb7-a1b6-b51ec042aa85`

**Contributors (9):** Maya Torres · Emma Zhang · Carlos Rodriguez · Olivia Martinez · Kai Tanaka · Zoe Williams · Miguel Garcia · Aisha Johnson · Benjamin Lee
**Collabs (2):** "The Water Is Always There" (local) · "Everyone Who Was There" (private)
**Campaigns (2):** Risograph Press Co. · The Standing Desk
**Communications:** true

**Overlap is intentional** — Maya Torres, Emma Zhang, Carlos Rodriguez, Olivia Martinez appear in both. Real curation overlaps on strong work; the magazines still diverge through different collabs, campaigns, and emphasis.

---

## 9. Pre-Flight Checklist

- [ ] Bucket confirmed **public**
- [ ] All 41 images uploaded to `seed/`
- [ ] `<BUCKET>` name substituted into every URL
- [ ] Period end_date still in the future
- [ ] `content.status = 'submitted'` on every submission (drafts won't generate)
- [ ] All `media_url` are `https://` — never `blob:`
- [ ] `order_index` set 0-based per submission
- [ ] Exactly one `is_feature = true` per submission
- [ ] Private collab participants all `invite_status = 'accepted'`
- [ ] Existing seed media_url values preserved (⚠️ re-running seed.sql wipes them)