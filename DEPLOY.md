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

## The AI key (pick ANY one — free options first)
BrainRot's generator is provider-flexible. Set exactly one of these env vars:

| Env var | Provider | Cost |
|---|---|---|
| `GROQ_API_KEY` | Groq (Llama) — console.groq.com | **Free** — no credit card |
| `GEMINI_API_KEY` | Google Gemini — aistudio.google.com | **Free** — no credit card |
| `OPENAI_API_KEY` | OpenAI | paid |
| `ANTHROPIC_API_KEY` | Claude | paid |

Optional `BRAINROT_MODEL` overrides the model for whichever provider is active.

## Going live (two clicks — your account/keys, so you do these)
1. **Connect the repo to Vercel.** vercel.com → Add New → Project → import
   `hassanahashish-design/study-quest`. Framework preset: **Other** (it's static + an /api function).
   Deploy. You get a `*.vercel.app` URL that has the working backend.
2. **Add the key.** Vercel → the project → Settings → Environment Variables →
   add one of the vars above (e.g. `GROQ_API_KEY`). Redeploy (Deployments → ⋯ → Redeploy).

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

## Local testing with a real key (no Vercel)
Put your key (Groq/Gemini/OpenAI/Anthropic) on one line in `study-quest/.dev-key`
(gitignored). The dev server auto-detects the provider from the key prefix
(`gsk_`→Groq, `AIza`→Gemini, `sk-ant-`→Claude, `sk-`→OpenAI). Then run the
`brainrot-dev` launch config and drop a file — quests build for real, for free.

## Local testing without any key
Append `?mock=1` to the URL — file-drop returns a canned quest so the full
gate → loading → play flow can be exercised offline.
