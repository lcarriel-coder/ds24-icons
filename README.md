# digistore24-icons

Pipeline to export SVG icons from Figma and publish them as static assets.

## What this repo does

- Reads icon node IDs from `config/icon-map.json`
- Downloads SVGs from the Figma Images API
- Writes generated files to `icons/` (manual map) or `icons-auto/` (parent-frame auto export)
- Automates updates with GitHub Actions

## Project structure

- `config/icon-map.json`: mapping between icon name and Figma node ID
- `scripts/export-from-figma.mjs`: exporter script (uses `icon-map.json`)
- `scripts/export-from-figma-auto.mjs`: exporter from parent frame node IDs (no map file)
- `icons/`: generated SVG output (manual / `icon-map.json`)
- `icons-auto/`: generated SVG output (auto / parent frame IDs)
- `.github/workflows/export-icons.yml`: CI export workflow (manual map)
- `.github/workflows/export-icons-auto.yml`: CI export workflow (parent IDs input)

## Setup

1. Install dependencies:

```bash
npm install
```

2. Add environment variables locally:

```bash
export FIGMA_TOKEN="your-figma-token"
export FIGMA_FILE_KEY="your-figma-file-key"
```

3. Run export:

```bash
npm run export:figma
```

### Auto export (parent frames, no `icon-map.json`)

Export every **direct child** of one or more parent frames (e.g. `icons-ds24`). Pass parent node IDs in API form (`123:456`) or URL form from copy link (`123-456`). Multiple parents: comma-separated.

```bash
export FIGMA_PARENT_NODE_IDS="2474:1, 2500:10"
npm run export:figma:auto
```

In GitHub: **Actions → Export Icons from Figma (auto) → Run workflow** and paste the same string into `parent_node_ids`.

If two layers resolve to the same file name, the script uses `name-2`, `name-3`, etc.

Auto exports are written under **`icons-auto/`** (not `icons/`). Point your CDN or `ICONS_BASE` at `/icons-auto/...` when using that workflow.

## GitHub Actions secrets

Set these repository secrets:

- `FIGMA_TOKEN`
- `FIGMA_FILE_KEY`

## CDN publishing

Recommended: publish this repository as static hosting (Cloudflare Pages or GitHub Pages).

Use versioned paths for cache safety:

- `/icons/v1/pen.svg`
- `/icons/v2/pen.svg`

## Consuming in Web Awesome

```js
const ICONS_BASE = "https://YOUR-CDN/icons/v1";

registerIconLibrary("digi24", {
  resolver: (name) => `${ICONS_BASE}/${name}.svg`,
  mutator: (svg) => {
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "1.75");
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");
  }
});
```
