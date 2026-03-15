#!/usr/bin/env node
/**
 * generate-tokens-batch.mjs
 * Batch-generates D&D combat tokens via Stable Horde (free, no API key).
 * Submits all jobs in parallel, then polls concurrently for speed.
 *
 * Usage:
 *   node scripts/generate-tokens-batch.mjs
 *   node scripts/generate-tokens-batch.mjs --skip-existing
 *   node scripts/generate-tokens-batch.mjs --dry-run
 */
import { writeFileSync, existsSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const V2_DIR = join(ROOT, "public", "portraits", "v2");
const BEASTS_DIR = join(V2_DIR, "beasts");
mkdirSync(BEASTS_DIR, { recursive: true });

const skipExisting = process.argv.includes("--skip-existing");
const dryRun = process.argv.includes("--dry-run");
const sizeArg = process.argv.find(a => a.startsWith("--size="));
const modelArg = process.argv.find(a => a.startsWith("--model="));
const MAX_FREE_SIZE = 704;
const requestedSize = Number.parseInt(sizeArg?.split("=")[1] || String(MAX_FREE_SIZE), 10);
const IMAGE_SIZE = Number.isFinite(requestedSize) ? Math.min(Math.max(requestedSize, 256), MAX_FREE_SIZE) : MAX_FREE_SIZE;
const MODEL_NAME = modelArg?.split("=")[1] || "stable_diffusion";

const HORDE_API = "https://stablehorde.net/api/v2";
const API_KEY = "0000000000";
const HEADERS = { "Content-Type": "application/json", "apikey": API_KEY, "Client-Agent": "dnd-token-gen:1.0:local" };

const STYLE_PREFIX = "D&D Monster Manual illustration, circular token, painted fantasy art, bust portrait, dark near-black background, high contrast, bold outlines, no text, no border, subject fills frame, razor-sharp focus, crisp edges, high micro-detail texture, ";
const NEG = "text, watermark, border, white background, cartoon, anime, modern, blurry, soft focus, low detail, smudged brushwork, extra horns";

const BEASTS = [
  { slug: "allosaurus",              displayName: "Allosaurus",              notes: "large bipedal carnivorous dinosaur, powerful jaws, tiny forelimbs" },
  { slug: "ankylosaurus",            displayName: "Ankylosaurus",            notes: "armoured quadruped dinosaur, heavy bony back plates, club tail" },
  { slug: "brown-bear",              displayName: "Brown Bear",              notes: "large brown bear, powerful claws, shaggy fur" },
  { slug: "deinonychus",             displayName: "Deinonychus",             notes: "raptor dinosaur, sharp sickle claw, feathered, bipedal" },
  { slug: "dire-wolf",               displayName: "Dire Wolf",               notes: "large prehistoric wolf, heavy muscular build, intense eyes" },
  { slug: "elephant",                displayName: "Elephant",                notes: "African elephant, large tusks, grey skin, trunk raised" },
  { slug: "giant-ape",               displayName: "Giant Ape",               notes: "massive silverback gorilla, knuckle-walking, fierce expression" },
  { slug: "giant-boar",              displayName: "Giant Boar",              notes: "enormous wild boar, thick hide, large curved tusks, enraged snout" },
  { slug: "giant-constrictor-snake", displayName: "Giant Constrictor Snake", notes: "enormous python or anaconda, coiled, heavy scales, cold eyes" },
  { slug: "giant-crocodile",         displayName: "Giant Crocodile",         notes: "massive crocodile, armoured scutes, massive jaws, low-angle view" },
  { slug: "giant-eagle",             displayName: "Giant Eagle",             notes: "colossal eagle, golden feathers, intense yellow eyes, wings spread" },
  { slug: "giant-elk",               displayName: "Giant Elk",               notes: "enormous elk, massive branching antlers, regal pose" },
  { slug: "giant-hyena",             displayName: "Giant Hyena",             notes: "huge spotted hyena, powerful neck and jaws, unsettling grin" },
  { slug: "giant-scorpion",          displayName: "Giant Scorpion",          notes: "enormous black scorpion, pincers raised, curved stinger, segmented armour" },
  { slug: "giant-shark",             displayName: "Giant Shark",             notes: "enormous great white shark, rows of teeth, dark dorsal, pale belly" },
  { slug: "giant-spider",            displayName: "Giant Spider",            notes: "huge black spider, multiple eyes gleaming, fangs visible, abdomen raised" },
  { slug: "giant-toad",              displayName: "Giant Toad",              notes: "enormous warty toad, wide mouth, bulging eyes, mottled green-brown skin" },
  { slug: "giant-vulture",           displayName: "Giant Vulture",           notes: "enormous vulture, bald head, dark wings spread, predatory glare" },
  { slug: "hunter-shark",            displayName: "Hunter Shark",            notes: "large aggressive shark, streamlined, teeth bared, hunting pose" },
  { slug: "killer-whale",            displayName: "Killer Whale",            notes: "orca, distinctive black and white markings, powerful, leaping or surfacing pose" },
  { slug: "lion",                    displayName: "Lion",                    notes: "powerful lion, full mane, piercing amber eyes, regal and fierce" },
  { slug: "mammoth",                 displayName: "Mammoth",                 notes: "woolly mammoth, long curved tusks, thick shaggy fur, massive head" },
  { slug: "plesiosaurus",            displayName: "Plesiosaurus",            notes: "long-necked aquatic reptile, smooth skin, four paddle flippers, small head" },
  { slug: "polar-bear",              displayName: "Polar Bear",              notes: "large polar bear, white fur, small ears, black eyes and nose" },
  { slug: "rhinoceros",              displayName: "Rhinoceros",              notes: "white rhinoceros, thick grey skin, prominent horn, heavy build" },
  { slug: "saber-toothed-tiger",     displayName: "Saber-Toothed Tiger",     notes: "prehistoric big cat, enormous curved upper fangs, striped fur, powerful" },
  { slug: "sheep",                   displayName: "Giant Sheep",             notes: "enormous sheep, thick wool fleece, sturdy legs" },
  { slug: "tiger",                   displayName: "Tiger",                   notes: "Bengal tiger, bold orange and black stripes, intense golden eyes" },
  { slug: "t-rex",                   displayName: "Tyrannosaurus Rex",       notes: "enormous T-Rex, massive head and jaws, tiny forelimbs, apex predator" },
  { slug: "triceratops",             displayName: "Triceratops",             notes: "quadruped dinosaur, three horns, large bony frill, charging pose" },
];
const EXTRAS = [
  { slug: "zombie",                outDir: V2_DIR, displayName: "Zombie",               notes: "authentic undead zombie, decayed rotting skin, exposed bone, sunken cheeks, hollow pale eyes, torn wrappings, no horns" },
  { slug: "player-dragonborn-bard",outDir: V2_DIR, displayName: "Gem Dragonborn Bard",  notes: "gem dragonborn bard, iridescent crystalline scales, holding lute, colorful clothes, heroic" },
];

const allJobs = [
  ...EXTRAS.map(({ slug, outDir, displayName, notes }) => ({ slug, outPath: join(outDir, slug + ".png"), displayName, notes })),
  ...BEASTS.map(({ slug, displayName, notes }) => ({ slug, outPath: join(BEASTS_DIR, slug + ".png"), displayName, notes })),
];

function buildPrompt(displayName, notes) {
  return STYLE_PREFIX + displayName + ", " + notes;
}

async function submitJob(prompt) {
  const res = await fetch(HORDE_API + "/generate/async", {
    method: "POST",
    headers: HEADERS,
    body: JSON.stringify({
      prompt: prompt + " ### " + NEG,
      params: { width: IMAGE_SIZE, height: IMAGE_SIZE, steps: 40, cfg_scale: 8, sampler_name: "k_euler_a", n: 1 },
      models: [MODEL_NAME],
      r2: true,
    }),
  });
  if (!res.ok) { const t = await res.text(); throw new Error("Submit HTTP " + res.status + " " + t.slice(0,100)); }
  const d = await res.json();
  if (!d.id) throw new Error("No ID: " + JSON.stringify(d));
  return d.id;
}

async function waitAndFetch(jobId, slug) {
  const start = Date.now();
  while (Date.now() - start < 600000) {
    await new Promise(r => setTimeout(r, 6000));
    try {
      const res = await fetch(HORDE_API + "/generate/check/" + jobId, { headers: HEADERS });
      if (!res.ok) continue;
      const s = await res.json();
      if (s.faulted) throw new Error("Job faulted for " + slug);
      if (!s.done) continue;
      // Fetch result
      const r2 = await fetch(HORDE_API + "/generate/status/" + jobId, { headers: HEADERS });
      if (!r2.ok) throw new Error("Status HTTP " + r2.status);
      const data = await r2.json();
      const gen = data.generations?.[0];
      if (!gen) throw new Error("No generation for " + slug);
      if (gen.img && !gen.img.startsWith("http")) return Buffer.from(gen.img, "base64");
      const imgRes = await fetch(gen.img);
      return Buffer.from(await imgRes.arrayBuffer());
    } catch(e) { if (e.message.includes("faulted")) throw e; }
  }
  throw new Error("Timeout for " + slug);
}

if (dryRun) {
  for (const { slug, displayName, notes } of allJobs) {
    console.log("[DRY RUN] " + slug + ":\n  " + buildPrompt(displayName, notes) + "\n");
  }
  process.exit(0);
}

const toGenerate = allJobs.filter(j => !(skipExisting && existsSync(j.outPath)));
const skipped = allJobs.length - toGenerate.length;
console.log("Batch: " + allJobs.length + " total, " + toGenerate.length + " to generate" + (skipped ? ", " + skipped + " skipped" : "") + "\n");
console.log("Render settings: " + IMAGE_SIZE + "x" + IMAGE_SIZE + ", model=" + MODEL_NAME + "\n");

// Submit all jobs
console.log("Submitting " + toGenerate.length + " jobs to Stable Horde...");
const jobMap = new Map(); // jobId -> job info
let submitFailed = [];
for (const job of toGenerate) {
  try {
    const prompt = buildPrompt(job.displayName, job.notes);
    const jobId = await submitJob(prompt);
    jobMap.set(jobId, { ...job, prompt });
    process.stdout.write(".");
    await new Promise(r => setTimeout(r, 500)); // small spacing
  } catch(e) {
    console.error("\n  Submit failed for " + job.slug + ": " + e.message);
    submitFailed.push(job.slug);
  }
}
console.log("\nAll jobs submitted. Waiting for results...\n");

// Poll all concurrently
const results = await Promise.allSettled(
  [...jobMap.entries()].map(([jobId, job]) =>
    waitAndFetch(jobId, job.slug).then(buf => {
      writeFileSync(job.outPath, buf);
      console.log("  ✓ " + job.slug + ".png (" + Math.round(buf.length/1024) + " KB)");
      return job.slug;
    })
  )
);

const passed = results.filter(r => r.status === "fulfilled").length;
const failed = results.filter(r => r.status === "rejected");
console.log("\nBatch complete: " + passed + " generated, " + failed.length + " failed" + (submitFailed.length ? ", " + submitFailed.length + " not submitted" : ""));
if (failed.length) {
  console.log("Failures:", failed.map(r => r.reason?.message).join("; "));
  console.log("Re-run with --skip-existing to retry failed tokens.");
}
