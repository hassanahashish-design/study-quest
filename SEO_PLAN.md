# BrainRot — SEO / AEO plan

Applied 2026-07-10. Follows the website-factory SEO/AEO standard.

## Target queries
- **Primary:** "turn your notes into a study game" (tool intent). Crowded space
  (Quizgecko, Revisely, Kuse, studyquest.app), so BrainRot competes on **differentiation**,
  not head-on generic "AI quiz" volume.
- **Differentiator angle (where we can win):** "Duolingo for studying your notes",
  "study game from a PDF", "gamified revision app", brand queries ("BrainRot study app").
- **Secondary/long-tail:** flashcards from notes, exam revision game, quiz from lecture
  notes, study game for students/teens.

## On-page (index.html)
- H1 = "Turn your notes into a game" (one, intent-matched).
- Title 44 chars; meta description 151 chars.
- Full head: canonical, hreflang en + x-default, robots + googlebot (unrestricted
  snippets), identity meta set, full Open Graph (en_US, og:image 1200×630 with dims+alt),
  twitter summary_large_image.
- Real crawlable content: How-it-works, Features, Pricing, FAQ (6 Q&A), footer.
- OG image: `og-image.png` (1200×630), generated.

## JSON-LD (3 blocks, @id-stitched)
- Organization (`#org`).
- WebApplication (`#app`) — EducationalApplication, `offers` price 0 USD (free, honest),
  featureList; `publisher` → `#org`.
- FAQPage (`#faq`) — mirrors the visible FAQ **verbatim** (verified in build).
- **No `aggregateRating`** — deliberately omitted; no verified reviews yet. Add only with
  ≥10 real reviews.

## AEO
- `robots.txt` — AI allowlist incl. **OAI-SearchBot**, GPTBot, ChatGPT-User, ClaudeBot,
  PerplexityBot, Google-Extended, CCBot; Sitemap line.
- `sitemap.xml` — home only, lastmod 2026-07-10, hreflang set.
- `llms.txt` — summary, dated facts, page directory, how-it-works, citation guidance.
- Dated self-evidencing facts in copy + llms ("As of July 2026, BrainRot is free…").

## ⚠️ Before launch — set the real domain
All absolute URLs use **`https://brainrotstudy.io/`** as the assumed production domain
(the name's domain, currently unregistered). If you launch on a different domain
(a `*.vercel.app` URL or another custom domain), find-and-replace `brainrotstudy.io`
across: `index.html` (canonical, hreflang, OG/twitter, all 3 JSON-LD blocks),
`robots.txt` (Sitemap line), `sitemap.xml` (loc + hreflang), `llms.txt`.

## Post-deploy checklist
- Submit sitemap in Google Search Console (+ Bing Webmaster).
- Re-test JSON-LD in Google Rich Results Test after the domain is final.
- Verify robots.txt / sitemap.xml / llms.txt each return 200 on the live domain.
- Add real social profiles to Organization `sameAs` once they exist.
