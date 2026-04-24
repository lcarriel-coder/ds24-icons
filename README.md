# digistore24-icons

Pipeline to export SVG icons from Figma and publish them as static assets.

## What this repo does

- Reads icon node IDs from `config/icon-map.json`
- Downloads SVGs from the Figma Images API
- Writes generated files to `icons/`
- Automates updates with GitHub Actions

## Project structure

- `config/icon-map.json`: mapping between icon name and Figma node ID
- `scripts/export-from-figma.mjs`: exporter script
- `icons/`: generated SVG output
- `.github/workflows/export-icons.yml`: CI export workflow

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
