import { mkdir, writeFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const outputDir = path.join(projectRoot, "public", "logos", "subscriptions");
const aliasFile = path.join(__dirname, "selfhst-logo-aliases.json");

const INDEX_URL = "https://cdn.jsdelivr.net/gh/selfhst/icons/index.json";
const SVG_BASE = "https://cdn.jsdelivr.net/gh/selfhst/icons/svg";

async function main() {
  const aliases = JSON.parse(readFileSync(aliasFile, "utf-8"));
  await mkdir(outputDir, { recursive: true });

  const indexRes = await fetch(INDEX_URL);
  if (!indexRes.ok) {
    throw new Error(`Failed to fetch icon index: ${indexRes.status}`);
  }

  const index = await indexRes.json();
  const entries = Array.isArray(index) ? index : [];
  const references = entries
    .map((entry) => String(entry.Reference || "").trim().toLowerCase())
    .filter(Boolean);
  const available = new Set(references);

  const tasks = Object.entries(aliases).map(async ([localName, slug]) => {
    const normalizedSlug = String(slug).toLowerCase();
    if (!available.has(normalizedSlug)) {
      const guess = references.find((ref) => ref.includes(normalizedSlug) || normalizedSlug.includes(ref));
      if (guess) {
        console.warn(`[warn] ${normalizedSlug} not found, using closest match: ${guess}`);
      } else {
        console.warn(`[warn] ${normalizedSlug} not found in index, trying direct URL`);
      }
    }

    const targetRef = available.has(normalizedSlug)
      ? normalizedSlug
      : references.find((ref) => ref.includes(normalizedSlug) || normalizedSlug.includes(ref)) || normalizedSlug;

    const svgUrl = `${SVG_BASE}/${targetRef}.svg`;
    const svgRes = await fetch(svgUrl);
    if (!svgRes.ok) {
      console.warn(`[skip] failed to download ${targetRef}: ${svgRes.status}`);
      return;
    }

    const content = await svgRes.text();
    const outPath = path.join(outputDir, `${localName}.svg`);
    await writeFile(outPath, content, "utf-8");
    console.log(`[ok] ${localName}.svg`);
  });

  await Promise.all(tasks);
  console.log(`Done. Logos saved to: ${outputDir}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
