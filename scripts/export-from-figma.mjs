import fs from "fs-extra";
import path from "path";

const FIGMA_TOKEN = process.env.FIGMA_TOKEN;
const FIGMA_FILE_KEY = process.env.FIGMA_FILE_KEY;

if (!FIGMA_TOKEN || !FIGMA_FILE_KEY) {
  throw new Error("Missing FIGMA_TOKEN or FIGMA_FILE_KEY");
}

const mapPath = path.resolve("config/icon-map.json");
const iconsDir = path.resolve("icons");
const iconMap = await fs.readJson(mapPath);

await fs.ensureDir(iconsDir);

const ids = iconMap.map((x) => x.nodeId).join(",");
const url = `https://api.figma.com/v1/images/${FIGMA_FILE_KEY}?ids=${encodeURIComponent(ids)}&format=svg`;

const imagesResp = await fetch(url, {
  headers: { "X-Figma-Token": FIGMA_TOKEN }
});

if (!imagesResp.ok) {
  throw new Error(`Figma images API failed: ${imagesResp.status} ${await imagesResp.text()}`);
}

const imagesJson = await imagesResp.json();
const images = imagesJson.images || {};

for (const item of iconMap) {
  const svgUrl = images[item.nodeId];
  if (!svgUrl) {
    console.warn(`No SVG URL for nodeId ${item.nodeId} (${item.name})`);
    continue;
  }

  const svgResp = await fetch(svgUrl);
  if (!svgResp.ok) {
    console.warn(`Failed download ${item.name}: ${svgResp.status}`);
    continue;
  }

  const svg = await svgResp.text();
  const outPath = path.join(iconsDir, `${item.name}.svg`);
  await fs.writeFile(outPath, svg, "utf8");
  console.log(`Saved ${outPath}`);
}

console.log("Done.");
