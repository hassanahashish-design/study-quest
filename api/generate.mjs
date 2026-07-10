// BrainRot — quest generator (Vercel serverless function)
// Takes extracted notes text, asks Claude to write a Duolingo-style quest,
// validates + structures it into the shape the game consumes: {units, topics, cards}.
//
// Requires env var ANTHROPIC_API_KEY (set in the Vercel dashboard — never in code).

const MODEL = process.env.BRAINROT_MODEL || "claude-haiku-4-5-20251001";
const MAX_CHARS = 80000;   // ~20k tokens of notes (~a full chapter) — cost/abuse cap
const MIN_CHARS = 200;     // below this the file probably had no readable text (scanned PDF)
const PALETTE = ["blue", "orange", "green", "purple", "teal", "red"];

const SYSTEM = `You turn a student's course notes into a short, fun, Duolingo-style quiz for TEENAGERS.
Output ONLY one JSON object (no markdown, no code fences, no commentary). Shape:

{
 "title": "short catchy quest title (2-4 words)",
 "units": [
   { "name": "1-3 word topic", "ico": "one emoji",
     "skills": [
       { "name": "2-4 word skill", "ico": "one emoji",
         "qs": [
           { "d": 1, "q": "question stem",
             "o": ["opt A","opt B","opt C","opt D"], "a": 0,
             "n": "one-sentence explanation after answering",
             "tip": "optional memory hook (omit key if none)",
             "w": { "q": "a deeper 'why' question on the same idea",
                    "o": ["A","B","C","D"], "a": 2,
                    "e": "deeper explanation, may use <b>bold</b> on key terms" } }
         ] } ] } ],
 "cards": [ ["TERM or acronym","tight one-sentence definition"] ]
}

RULES (obey exactly):
1. Base EVERY fact ONLY on the provided notes. Never invent facts. If the notes are thin, make fewer questions.
2. Size: 1-3 units, 2-4 skills per unit, 4-5 questions per skill. Aim ~12-20 questions total. Plus 6-12 flashcards.
3. Exactly 4 options per question (main and "w"). "a" is the 0-based index of the correct option. Vary which index is correct.
4. LENGTH MUST NOT REVEAL THE ANSWER: make all four options near-equal length (longest minus shortest <= 6 characters) and equal specificity. The correct option must NEVER be the single longest or most-detailed one. Distractors are plausible but clearly wrong to someone who knows the material.
5. Options are short (< 12 words). Use <b>...</b> only inside "e". No other HTML, no markdown. Escape quotes so the JSON parses. No trailing commas.
6. Every question needs a valid "w" follow-up. "n" and "w.e" must be accurate and teach the idea.
Return the JSON object and nothing else.`;

function clampInt(v, lo, hi, dflt) {
  const n = Number.isInteger(v) ? v : parseInt(v, 10);
  if (Number.isNaN(n)) return dflt;
  return Math.min(hi, Math.max(lo, n));
}

function validOpts(o) {
  return Array.isArray(o) && o.length === 4 && o.every(x => typeof x === "string" && x.trim().length > 0);
}

function cleanQuestion(q) {
  if (!q || typeof q.q !== "string" || !validOpts(q.o)) return null;
  const a = clampInt(q.a, 0, 3, -1);
  if (a < 0) return null;
  const w = q.w;
  if (!w || typeof w.q !== "string" || !validOpts(w.o) || typeof w.e !== "string") return null;
  const wa = clampInt(w.a, 0, 3, -1);
  if (wa < 0) return null;
  const out = {
    d: clampInt(q.d, 1, 3, 1),
    q: q.q.trim(),
    o: q.o.map(s => s.trim()),
    a,
    n: typeof q.n === "string" ? q.n.trim() : "",
    w: { q: w.q.trim(), o: w.o.map(s => s.trim()), a: wa, e: w.e.trim() }
  };
  if (typeof q.tip === "string" && q.tip.trim()) out.tip = q.tip.trim();
  return out;
}

// Turn the LLM's loose object into the game's exact {units, topics, cards},
// assigning stable keys/ids/colors and dropping anything malformed.
function structure(raw) {
  const units = [];
  const topics = [];
  const rawUnits = Array.isArray(raw.units) ? raw.units : [];
  let ui = 0;
  for (const u of rawUnits) {
    if (ui >= 6) break;
    const key = "U" + (ui + 1);
    const skills = Array.isArray(u.skills) ? u.skills : [];
    const keptSkills = [];
    let si = 0;
    for (const s of skills) {
      const qs = (Array.isArray(s.qs) ? s.qs : []).map(cleanQuestion).filter(Boolean);
      if (!qs.length) continue;
      const id = key + "S" + (si + 1);
      topics.push({
        id,
        u: key,
        ico: typeof s.ico === "string" && s.ico ? s.ico : "📗",
        name: typeof s.name === "string" && s.name ? s.name.trim() : "Skill " + (si + 1),
        qs
      });
      keptSkills.push(id);
      si++;
      if (si >= 6) break;
    }
    if (!keptSkills.length) continue;
    units.push({
      key,
      ico: typeof u.ico === "string" && u.ico ? u.ico : "📚",
      name: typeof u.name === "string" && u.name ? u.name.trim() : "Unit " + (ui + 1),
      color: PALETTE[ui % PALETTE.length]
    });
    ui++;
  }
  const cards = (Array.isArray(raw.cards) ? raw.cards : [])
    .filter(c => Array.isArray(c) && c.length === 2 && typeof c[0] === "string" && typeof c[1] === "string" && c[0].trim() && c[1].trim())
    .map(c => [c[0].trim(), c[1].trim()])
    .slice(0, 24);
  const title = typeof raw.title === "string" && raw.title.trim() ? raw.title.trim() : "Your Quest";
  return { title, units, topics, cards };
}

function extractJson(text) {
  if (!text) throw new Error("empty model response");
  let t = text.trim();
  // strip ```json ... ``` fences if present
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) t = fence[1].trim();
  // otherwise slice from first { to last }
  if (t[0] !== "{") {
    const a = t.indexOf("{"), b = t.lastIndexOf("}");
    if (a >= 0 && b > a) t = t.slice(a, b + 1);
  }
  return JSON.parse(t);
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "content-type");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return res.status(500).json({ error: "Server not configured: ANTHROPIC_API_KEY is missing." });

  let body = req.body;
  try { if (typeof body === "string") body = JSON.parse(body); } catch { body = null; }
  const text = body && typeof body.text === "string" ? body.text : "";
  // Count real (non-whitespace) chars for the "enough text?" gate; keep original text for the model.
  const contentLen = text.replace(/\s+/g, "").length;

  if (contentLen < MIN_CHARS) {
    return res.status(422).json({
      error: "not_enough_text",
      message: "I couldn't read enough text from that file. If it's a scanned PDF or a photo, the text isn't selectable — try a PDF with real text or paste your notes."
    });
  }
  const notes = text.trim().slice(0, MAX_CHARS);

  let data;
  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json"
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 8000,
        system: SYSTEM,
        messages: [{ role: "user", content: "Here are the notes. Build the quest JSON now.\n\n<notes>\n" + notes + "\n</notes>" }]
      })
    });
    if (!r.ok) {
      const detail = await r.text().catch(() => "");
      return res.status(502).json({ error: "model_error", message: "The quest generator had a problem. Try again in a moment.", detail: detail.slice(0, 300) });
    }
    const payload = await r.json();
    const out = (payload.content || []).filter(b => b.type === "text").map(b => b.text).join("");
    data = extractJson(out);
  } catch (e) {
    return res.status(502).json({ error: "generation_failed", message: "Couldn't build a quest from that. Try again or use a different file.", detail: String(e && e.message || e).slice(0, 200) });
  }

  const quest = structure(data);
  if (!quest.topics.length) {
    return res.status(422).json({ error: "empty_quest", message: "I read the file but couldn't make solid questions from it. Try notes with more explained concepts." });
  }
  return res.status(200).json(quest);
}
