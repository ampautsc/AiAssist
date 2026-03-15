# Combat Token & GUI Accessibility Requirements

## Combat Chip / Token Design Rules

These rules apply whenever generating, selecting, or rendering entity tokens (portraits/chips)
on the hex battle map.

### 1. No Color-Only Differentiation
- **NEVER** use color as the sole way to distinguish entities, states, or factions.
- Every meaningful distinction must have a **secondary visual cue**: shape, label, icon, border
  pattern, or silhouette difference.
- Examples: player vs enemy must differ in border shape (circle/square) OR have a visible label,
  NOT just a blue vs red tint.

### 2. High Contrast at Small Sizes
- Tokens render at approximately **40–80px diameter** on the canvas.
- Art must be legible at that size: bold outlines, strong value contrast, no fine textures.
- Background should be **dark** (very dark brown, black, near-black) to maximise figure contrast.
- Foreground subject should fill **70–85%** of the token area.

### 3. Simple, Readable Silhouette
- The creature's silhouette must be immediately recognisable without colour cues.
- Avoid: fine detail, overlapping limbs that blur the outline, full-body scenes.
- Prefer: bust portrait (head + upper torso) or a clean ¾ pose with clear outline.

### 4. Classic D&D Illustrated Style
- Target aesthetic: **Monster Manual / Roll20 token art** — lightly painted, not photographic,
  not flat cartoon.
- Muted, earthy palette. Avoid neon / oversaturated colours.
- One consistent lighting source (front-left or front is conventional).
- No background scenery that competes with the subject.

### 5. Format: Circular Token — Square Source, No Alpha Border
- Source images stored in `public/portraits/v2/` must be **square PNG** (1024×1024).
- The canvas renderer clips to a circle; the subject should be centred in the square.
- Do NOT pre-crop to a circle at source — the renderer handles clipping.
- No white or coloured border baked into the PNG; borders are added by the canvas renderer.

### 6. Full-Square Crop for v2 Tokens
- Images under `/portraits/v2/` use a **full-square crop** (`cropSize = Math.min(iw, ih)`).
- Legacy images under `/portraits/` (non-v2) continue to use the top-65% face-crop.
- Canvas rendering code must detect the `/portraits/v2/` path prefix and apply the correct crop.

### 7. Accessibility — Limited Vision Users
- Tokens should rely on shape and value contrast, not hue, to be distinguishable.
- The HP bar beneath a token must always display a numeric value in addition to the bar fill.
- Active-turn highlight must use both a **glow/animation** AND a visible ring, not just colour.
- When generating new token art, request `background: "transparent"` only if the canvas renderer
  composites its own background; otherwise specify a solid dark background in the prompt.

## Image Generation Prompting Guidelines (gpt-image-1)

Use these prompts as building blocks. Always include:
- **Subject**: specific creature name
- **Format**: "circular D&D encounter token, bust portrait"
- **Style**: "painted illustration, Monster Manual style, high contrast"
- **Background**: "solid dark background, near-black"
- **Technical**: "no text, no border, centered subject, 1024x1024"

Example zombie prompt:
```
D&D encounter token, circular format, painted illustration of a zombie, bust portrait,
muted earth tones, decayed skin, hollow eyes, solid near-black background, high contrast,
bold outlines, Monster Manual style, no text, no border, subject fills 80% of frame
```

## Reference Image Workflow

When generating a batch of tokens (e.g., all beast forms):
1. Generate one reference token (typically the zombie — primary encounter enemy).
2. Show the reference to the product owner for approval before proceeding.
3. Pass the approved reference as `reference_image_url` to all subsequent `generate_token` calls
   with `input_fidelity: "high"`.
4. This ensures stylistic consistency across the full token set.
