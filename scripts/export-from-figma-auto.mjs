import fs from "fs-extra";
import path from "path";

const FIGMA_TOKEN = process.env.FIGMA_TOKEN;
const FIGMA_FILE_KEY = process.env.FIGMA_FILE_KEY;
const FIGMA_PARENT_NODE_IDS = process.env.FIGMA_PARENT_NODE_IDS;

/** Only INSTANCE layers whose name starts with this (case-insensitive). Fixed in code. */
const ICON_INSTANCE_NAME_PREFIX = "icon-";

if (!FIGMA_TOKEN || !FIGMA_FILE_KEY) {
  throw new Error("Missing FIGMA_TOKEN or FIGMA_FILE_KEY");
}
if (!FIGMA_PARENT_NODE_IDS?.trim()) {
  throw new Error("Missing FIGMA_PARENT_NODE_IDS (comma-separated parent frame node IDs)");
}

console.log(
  `Collecting INSTANCE nodes under each parent whose name starts with "${ICON_INSTANCE_NAME_PREFIX}" (case-insensitive)`
);

/** URL-style node-id uses hyphen; API uses colon. */
function normalizeNodeId(raw) {
  const s = String(raw).trim();
  if (!s) return null;
  if (s.includes(":")) return s;
  if (/^\d+-\d+$/.test(s)) return s.replace("-", ":");
  return s;
}

function sanitizeFileName(layerName) {
  const base = String(layerName ?? "")
    .trim()
    .replace(/^#+\s*/, "")
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return base || "unnamed";
}

function parseParentIds(input) {
  return input
    .split(",")
    .map((x) => normalizeNodeId(x))
    .filter(Boolean);
}

function uniqueName(baseName, used) {
  if (!used.has(baseName)) {
    used.add(baseName);
    return baseName;
  }
  let i = 2;
  let candidate = `${baseName}-${i}`;
  while (used.has(candidate)) {
    i += 1;
    candidate = `${baseName}-${i}`;
  }
  used.add(candidate);
  return candidate;
}

async function fetchJson(url) {
  const resp = await fetch(url, {
    headers: { "X-Figma-Token": FIGMA_TOKEN }
  });
  if (!resp.ok) {
    throw new Error(`Figma request failed: ${resp.status} ${await resp.text()}`);
  }
  return resp.json();
}

function nameMatchesIconPrefix(layerName) {
  return String(layerName ?? "")
    .trim()
    .toLowerCase()
    .startsWith(ICON_INSTANCE_NAME_PREFIX.toLowerCase());
}

/**
 * Depth-first: collect every INSTANCE under `root` (including nested) whose name starts with "icon-".
 * @param {Record<string, unknown> | null | undefined} root
 * @param {{ nodeId: string, layerName: string }[]} out
 */
function walkInstances(root, out) {
  if (!root) return;
  if (root.type === "INSTANCE" && root.id && root.name && nameMatchesIconPrefix(root.name)) {
    out.push({ nodeId: root.id, layerName: root.name });
  }
  if (Array.isArray(root.children)) {
    for (const child of root.children) {
      walkInstances(child, out);
    }
  }
}

const parentIds = parseParentIds(FIGMA_PARENT_NODE_IDS);
if (parentIds.length === 0) {
  throw new Error("No valid parent node IDs after parsing FIGMA_PARENT_NODE_IDS");
}

const nodesQuery = parentIds.map((id) => encodeURIComponent(id)).join(",");
const nodesUrl = `https://api.figma.com/v1/files/${FIGMA_FILE_KEY}/nodes?ids=${nodesQuery}`;
const nodesJson = await fetchJson(nodesUrl);
const nodesMap = nodesJson.nodes || {};

const iconEntries = [];
const usedNames = new Set();

for (const parentId of parentIds) {
  const entry = nodesMap[parentId];
  if (!entry?.document) {
    console.warn(`No document for parent nodeId ${parentId} (wrong id or no access?)`);
    continue;
  }
  const doc = entry.document;
  const found = [];
  walkInstances(doc, found);
  if (found.length === 0) {
    console.warn(
      `Parent ${parentId} (${doc.name ?? "?"}): no INSTANCE nodes with name starting "${ICON_INSTANCE_NAME_PREFIX}" under this subtree`
    );
    continue;
  }
  for (const { nodeId, layerName } of found) {
    const base = sanitizeFileName(layerName);
    const name = uniqueName(base, usedNames);
    iconEntries.push({ nodeId, name });
    console.log(`Mapped ${layerName} -> ${name}.svg (id ${nodeId}) under parent ${parentId}`);
  }
}

if (iconEntries.length === 0) {
  throw new Error("No icons discovered from parent frames. Check parent IDs and children.");
}

const iconsDir = path.resolve("icons-auto");
await fs.ensureDir(iconsDir);

const BATCH = 50;
for (let i = 0; i < iconEntries.length; i += BATCH) {
  const batch = iconEntries.slice(i, i + BATCH);
  const ids = batch.map((x) => x.nodeId).join(",");
  const url = `https://api.figma.com/v1/images/${FIGMA_FILE_KEY}?ids=${encodeURIComponent(ids)}&format=svg`;
  const imagesResp = await fetch(url, {
    headers: { "X-Figma-Token": FIGMA_TOKEN }
  });
  if (!imagesResp.ok) {
    throw new Error(`Figma images API failed: ${imagesResp.status} ${await imagesResp.text()}`);
  }
  const imagesJson = await imagesResp.json();
  const images = imagesJson.images || {};

  for (const item of batch) {
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
}

console.log("Done (auto).");
