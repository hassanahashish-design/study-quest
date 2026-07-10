# BrainRot — deploy notes

Duolingo-style study game. Drop a PDF of notes → Claude turns it into a quest → play.

## Architecture
- `index.html` — the whole game (static). Shows a **file-drop gate** first.
  - Drop a PDF → `pdf.js` (in `vendor/`) extracts the text in the browser.
  - Browser POSTs the text to `/api/generate`.
  - The returned quest `{units, topics, cards}` is rendered and saved to `localStorage`.
  - "Try a demo quest" plays the built-in cognitive-neuroscience quest (no API call).
- `api/generate.mjs` — Vercel serverless function. Calls Claude (Haiku) with a strict
  schema + the anti-length-tell rule, validates every question, returns the quest JSON.
- `vercel.json` — bumps the function timeout to 60s (the LLM call can take a while).

## Going live (two clicks — your account/keys, so you do these)
1. **Connect the repo to Vercel.** vercel.com → Add New → Project → import
   `hassanahashish-design/study-quest`. Framework preset: **Other** (it's static + an /api function).
   Deploy. You get a `*.vercel.app` URL that has the working backend.
2. **Add the API key.** Vercel → the project → Settings → Environment Variables →
   add `ANTHROPIC_API_KEY` = your Anthropic key. Redeploy (Deployments → ⋯ → Redeploy).

That's it — file-drop generation is now live 24/7, independent of any local machine.

### Optional
- Point a domain (e.g. `brainrotstudy.io`) at the Vercel project in Settings → Domains.
- Override the model with env `BRAINROT_MODEL` (default `claude-haiku-4-5-20251001`).

## Cost / guardrails (already in the function)
- Input capped at ~32k chars (~15 pages) → a few tenths of a cent per drop on Haiku.
- Files with < 200 real characters (scanned PDFs / photos) are rejected with a friendly message.
- Malformed questions/skills/cards from the model are dropped before reaching the game.

## Note on GitHub Pages
The old GitHub Pages URL (`hassanahashish-design.github.io/study-quest`) has no backend,
so the **demo works but real file-drop errors there**. Vercel is the real home once step 1+2 are done.

## Local testing without a key
Append `?mock=1` to the URL — file-drop returns a canned quest so the full
gate → loading → play flow can be exercised offline.
