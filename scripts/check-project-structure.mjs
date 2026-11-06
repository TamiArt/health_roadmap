import { readdir, readFile } from "node:fs/promises";
import { join, relative, extname } from "node:path";

const roots = ["src", "e2e", "scripts"];
const allowedExtensions = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".css"]);
const maxLines = 1500;
const violations = [];

async function visit(path) {
  let entries;
  try {
    entries = await readdir(path, { withFileTypes: true });
  } catch (error) {
    if (error.code === "ENOENT") return;
    throw error;
  }

  for (const entry of entries) {
    const fullPath = join(path, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== "node_modules" && entry.name !== "dist") await visit(fullPath);
      continue;
    }
    if (!allowedExtensions.has(extname(entry.name))) continue;

    const content = await readFile(fullPath, "utf8");
    const lines = content.split(/\r?\n/).length;
    if (lines > maxLines) violations.push(`${relative(process.cwd(), fullPath)}: ${lines} lines (limit ${maxLines})`);
  }
}

for (const root of roots) await visit(root);

if (violations.length) {
  console.error("Project structure check failed:");
  for (const violation of violations) console.error(`- ${violation}`);
  process.exitCode = 1;
} else {
  console.log(`Project structure check passed (maximum ${maxLines} lines per source file).`);
}
