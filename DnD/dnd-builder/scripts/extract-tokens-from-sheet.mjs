#!/usr/bin/env node
import { mkdirSync, writeFileSync } from 'fs';
import { basename, dirname, extname, isAbsolute, join, resolve } from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

function getArg(name, fallback = undefined) {
  const direct = process.argv.find(a => a.startsWith(`--${name}=`));
  if (direct) return direct.split('=')[1];
  const index = process.argv.findIndex(a => a === `--${name}`);
  if (index >= 0 && process.argv[index + 1] && !process.argv[index + 1].startsWith('--')) return process.argv[index + 1];
  return fallback;
}

function toInt(value, fallback) {
  const n = Number.parseInt(String(value), 10);
  return Number.isFinite(n) ? n : fallback;
}

function toFloat(value, fallback) {
  const n = Number.parseFloat(String(value));
  return Number.isFinite(n) ? n : fallback;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function parsePicks(raw) {
  if (!raw) return [];
  return raw
    .split(';')
    .map(part => part.trim())
    .filter(Boolean)
    .map(entry => {
      const [coordPart, slugPart] = entry.split(':');
      if (!coordPart || !slugPart) throw new Error(`Invalid pick entry: ${entry}`);
      const [rowStr, colStr] = coordPart.split(',');
      const row = Number.parseInt(rowStr, 10);
      const col = Number.parseInt(colStr, 10);
      if (!Number.isFinite(row) || !Number.isFinite(col)) {
        throw new Error(`Invalid row/col in pick entry: ${entry}`);
      }
      return { row, col, slug: slugPart.trim() };
    });
}

function sanitizeSlug(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'token';
}

const srcArg = getArg('src', process.argv[2]);
if (!srcArg) {
  console.error('Usage: node scripts/extract-tokens-from-sheet.mjs --src=<image> [--rows=5] [--cols=6] [--out-dir=public/portraits/v2] [--size=704] [--inset=0.08] [--prefix=sheet] [--picks="0,1:zombie;0,2:skeleton"] [--dry-run]');
  process.exit(1);
}

const rows = Math.max(1, toInt(getArg('rows', '5'), 5));
const cols = Math.max(1, toInt(getArg('cols', '6'), 6));
const inset = Math.min(0.45, Math.max(0, toFloat(getArg('inset', '0.08'), 0.08)));
const outputSize = Math.max(128, Math.min(2048, toInt(getArg('size', '704'), 704)));
const autoCenterSubject = String(getArg('auto-center-subject', 'true')).toLowerCase() !== 'false';
const threshold = clamp(toInt(getArg('subject-threshold', '24'), 24), 1, 255);
const subjectPadding = Math.min(0.45, Math.max(0, toFloat(getArg('subject-padding', '0.10'), 0.10)));
const dryRun = process.argv.includes('--dry-run');
const picks = parsePicks(getArg('picks', ''));
const prefix = sanitizeSlug(getArg('prefix', basename(srcArg, extname(srcArg))));
const outDirArg = getArg('out-dir', 'public/portraits/v2/imported');

const srcPath = isAbsolute(srcArg) ? srcArg : resolve(process.cwd(), srcArg);
const outDir = isAbsolute(outDirArg) ? outDirArg : resolve(ROOT, outDirArg);
mkdirSync(outDir, { recursive: true });

const image = sharp(srcPath, { failOn: 'warning' });
const meta = await image.metadata();
if (!meta.width || !meta.height) throw new Error(`Could not read image dimensions: ${srcPath}`);

const cellW = meta.width / cols;
const cellH = meta.height / rows;

function planCenteredCellCrop(row, col, slug) {
  const leftBase = col * cellW;
  const topBase = row * cellH;
  const baseSize = Math.min(cellW, cellH);
  const pad = Math.round(baseSize * inset);
  const cropSize = Math.max(16, Math.floor(baseSize - pad * 2));
  const left = Math.max(0, Math.floor(leftBase + (cellW - cropSize) / 2));
  const top = Math.max(0, Math.floor(topBase + (cellH - cropSize) / 2));
  const width = Math.min(cropSize, meta.width - left);
  const height = Math.min(cropSize, meta.height - top);
  return { row, col, slug: sanitizeSlug(slug), left, top, width, height };
}

async function planSubjectCrop(row, col, slug) {
  const leftBase = Math.floor(col * cellW);
  const topBase = Math.floor(row * cellH);
  const widthBase = Math.max(1, Math.floor((col + 1) * cellW) - leftBase);
  const heightBase = Math.max(1, Math.floor((row + 1) * cellH) - topBase);

  const extracted = await image
    .clone()
    .extract({ left: leftBase, top: topBase, width: widthBase, height: heightBase })
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const px = extracted.data;
  const w = extracted.info.width;
  const h = extracted.info.height;

  let minX = w;
  let minY = h;
  let maxX = -1;
  let maxY = -1;
  let found = false;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const value = px[y * w + x];
      if (value >= threshold) {
        found = true;
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (!found) {
    return planCenteredCellCrop(row, col, slug);
  }

  const boxW = maxX - minX + 1;
  const boxH = maxY - minY + 1;
  const side = Math.max(16, Math.ceil(Math.max(boxW, boxH) * (1 + subjectPadding * 2)));
  const centerX = minX + boxW / 2;
  const centerY = minY + boxH / 2;

  let localLeft = Math.floor(centerX - side / 2);
  let localTop = Math.floor(centerY - side / 2);

  localLeft = clamp(localLeft, 0, Math.max(0, w - side));
  localTop = clamp(localTop, 0, Math.max(0, h - side));

  const finalSide = Math.min(side, w - localLeft, h - localTop);
  const left = clamp(leftBase + localLeft, 0, meta.width - 1);
  const top = clamp(topBase + localTop, 0, meta.height - 1);
  const width = clamp(finalSide, 1, meta.width - left);
  const height = clamp(finalSide, 1, meta.height - top);

  return { row, col, slug: sanitizeSlug(slug), left, top, width, height };
}

const rawTasks = picks.length > 0
  ? picks.map(p => ({ row: p.row, col: p.col, slug: p.slug }))
  : Array.from({ length: rows * cols }, (_, index) => {
      const row = Math.floor(index / cols);
      const col = index % cols;
      return { row, col, slug: `${prefix}-${String(index + 1).padStart(2, '0')}` };
    });

const tasks = [];
for (const task of rawTasks) {
  const planned = autoCenterSubject
    ? await planSubjectCrop(task.row, task.col, task.slug)
    : planCenteredCellCrop(task.row, task.col, task.slug);
  tasks.push(planned);
}

for (const task of tasks) {
  if (task.row < 0 || task.row >= rows || task.col < 0 || task.col >= cols) {
    throw new Error(`Pick out of bounds: row=${task.row}, col=${task.col}, rows=${rows}, cols=${cols}`);
  }
}

console.log(`Source: ${srcPath}`);
console.log(`Dimensions: ${meta.width}x${meta.height}`);
console.log(`Grid: ${rows}x${cols}, cell≈${cellW.toFixed(2)}x${cellH.toFixed(2)}, inset=${Math.round(inset * 100)}%`);
console.log(`Output: ${outDir}`);
console.log(`Mode: ${picks.length > 0 ? 'named picks' : 'extract all cells'} (${tasks.length} token(s))`);
console.log(`Centering: ${autoCenterSubject ? `subject-detect (threshold=${threshold}, padding=${Math.round(subjectPadding * 100)}%)` : `cell-center (inset=${Math.round(inset * 100)}%)`}`);

if (dryRun) {
  for (const task of tasks) {
    console.log(`[DRY] ${task.slug}.png <- row=${task.row} col=${task.col} crop=${task.left},${task.top},${task.width}x${task.height}`);
  }
  process.exit(0);
}

const written = [];
for (const task of tasks) {
  const outPath = join(outDir, `${task.slug}.png`);
  await image
    .clone()
    .extract({ left: task.left, top: task.top, width: task.width, height: task.height })
    .resize(outputSize, outputSize, { fit: 'cover', kernel: sharp.kernel.lanczos3 })
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toFile(outPath);
  written.push({
    slug: task.slug,
    file: outPath,
    row: task.row,
    col: task.col,
    crop: { left: task.left, top: task.top, width: task.width, height: task.height },
  });
  console.log(`  ✓ ${task.slug}.png (r${task.row} c${task.col})`);
}

const manifestPath = join(outDir, `${prefix}-manifest.json`);
writeFileSync(manifestPath, JSON.stringify({ source: srcPath, width: meta.width, height: meta.height, rows, cols, inset, outputSize, items: written }, null, 2));
console.log(`\nWrote ${written.length} token(s).`);
console.log(`Manifest: ${manifestPath}`);
