#!/usr/bin/env node
import { writeFileSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const slug = process.argv[2] || "zombie";
const sizeArg = process.argv.find(a => a.startsWith("--size="));
const modelArg = process.argv.find(a => a.startsWith("--model="));
const MAX_FREE_SIZE = 704;
const requestedSize = Number.parseInt(sizeArg?.split("=")[1] || String(MAX_FREE_SIZE), 10);
const IMAGE_SIZE = Number.isFinite(requestedSize) ? Math.min(Math.max(requestedSize, 256), MAX_FREE_SIZE) : MAX_FREE_SIZE;
const MODEL_NAME = modelArg?.split("=")[1] || "stable_diffusion";

const STYLE_PREFIX = "D&D Monster Manual illustration, circular token, painted fantasy art, bust portrait, dark near-black background, high contrast, bold outlines, no text, no border, subject fills frame, razor-sharp focus, crisp edges, high micro-detail texture, ";
const PROMPTS = {
  zombie: STYLE_PREFIX + "authentic undead zombie, decayed rotting flesh, exposed bone, sunken cheeks, hollow pale eyes, torn burial wrappings, gaunt expression, no horns",
  "player-dragonborn-bard": STYLE_PREFIX + "gem dragonborn bard, iridescent crystalline scales, holding lute, colorful traveling clothes, heroic",
};
const prompt = PROMPTS[slug] || (STYLE_PREFIX + slug.replace(/-/g, " ") + ", detailed fantasy creature");
const negativePrompt = "text, watermark, signature, border, white background, cartoon, anime, modern, blurry, soft focus, low detail, smudged brushwork, extra horns";

const HORDE_API = "https://stablehorde.net/api/v2";
const API_KEY = "0000000000";
const HEADERS = { "Content-Type": "application/json", "apikey": API_KEY, "Client-Agent": "dnd-token-gen:1.0:local" };

console.log("=== Generating token:", slug, "===");
console.log("Prompt:", prompt, "\n");
console.log("Settings:", `${IMAGE_SIZE}x${IMAGE_SIZE}`, "model=", MODEL_NAME, "\n");

async function submitJob() {
  const res = await fetch(HORDE_API + "/generate/async", {
    method: "POST",
    headers: HEADERS,
    body: JSON.stringify({
      prompt: prompt + " ### " + negativePrompt,
      params: { width: IMAGE_SIZE, height: IMAGE_SIZE, steps: 40, cfg_scale: 8, sampler_name: "k_euler_a", n: 1 },
      models: [MODEL_NAME],
      r2: true,
    }),
  });
  if (!res.ok) { const t = await res.text(); throw new Error("Submit failed: HTTP " + res.status + " " + t.slice(0,200)); }
  const data = await res.json();
  if (!data.id) throw new Error("No job ID: " + JSON.stringify(data));
  return data.id;
}

async function pollJob(jobId) {
  const start = Date.now();
  let ticks = 0;
  while (Date.now() - start < 600000) {
    await new Promise(r => setTimeout(r, 5000));
    try {
      const res = await fetch(HORDE_API + "/generate/check/" + jobId, { headers: HEADERS });
      if (!res.ok) continue;
      const s = await res.json();
      ticks++;
      if (ticks % 4 === 0) console.log("  queue=" + (s.queue_position ?? "?") + " wait=" + (s.wait_time ?? "?") + "s done=" + s.done);
      if (s.done) return;
      if (s.faulted) throw new Error("Job faulted");
    } catch(e) { if (e.message === "Job faulted") throw e; }
  }
  throw new Error("Timed out");
}

async function fetchResult(jobId) {
  const res = await fetch(HORDE_API + "/generate/status/" + jobId, { headers: HEADERS });
  if (!res.ok) throw new Error("Status fetch failed: " + res.status);
  const data = await res.json();
  const gen = data.generations?.[0];
  if (!gen) throw new Error("No generation in result");
  if (gen.img && !gen.img.startsWith("http")) return Buffer.from(gen.img, "base64");
  const imgRes = await fetch(gen.img);
  return Buffer.from(await imgRes.arrayBuffer());
}

console.log("Submitting to Stable Horde (free)...");
const jobId = await submitJob();
console.log("Job ID:", jobId);
console.log("Waiting for community workers (1-5 min)...\n");
await pollJob(jobId);
console.log("\nDone! Fetching image...");
const buf = await fetchResult(jobId);

const outDir = join(ROOT, "public", "portraits", "v2");
mkdirSync(outDir, { recursive: true });
const pngPath = join(outDir, slug + ".png");
writeFileSync(pngPath, buf);
console.log("Saved:", pngPath, "(" + Math.round(buf.length/1024) + " KB)");

const base64 = buf.toString("base64");
const dataUrl = "data:image/png;base64," + base64;
const htmlPath = join(outDir, slug + "-preview.html");
writeFileSync(htmlPath, `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Token Preview: ${slug}</title><style>body{margin:0;background:#1a1510;color:#c8b888;font-family:Georgia,serif;display:flex;flex-direction:column;align-items:center;gap:24px;padding:40px}h1{color:#f0d060}.row{display:flex;gap:40px;align-items:flex-end}.col{display:flex;flex-direction:column;align-items:center;gap:8px}label{font-size:12px;color:#887}.full img{width:512px;height:512px;border-radius:8px}.chip{width:100px;height:100px;border-radius:50%;overflow:hidden;box-shadow:0 0 0 3px #c8a040}.chip img{width:100%;height:100%;object-fit:cover}.mini{width:40px;height:40px;border-radius:50%;overflow:hidden;box-shadow:0 0 0 2px #c8a040}.mini img{width:100%;height:100%;object-fit:cover}p{font-size:11px;color:#665;max-width:600px;text-align:center;line-height:1.6}</style></head><body><h1>Token Preview: ${slug}</h1><div class="row"><div class="col full"><img src="${dataUrl}" alt="${slug}"><label>Full (512px)</label></div><div class="col"><div class="chip"><img src="${dataUrl}" alt=""></div><label>Chip (100px)</label><br><div class="mini"><img src="${dataUrl}" alt=""></div><label>Mini (40px)</label></div></div><p>${prompt}</p><p>Generated via Stable Horde (free)</p></body></html>`);
console.log("Preview:", htmlPath);
console.log("\nReview the HTML, then run: node scripts/generate-tokens-batch.mjs --size=" + IMAGE_SIZE + " --model=" + MODEL_NAME);
