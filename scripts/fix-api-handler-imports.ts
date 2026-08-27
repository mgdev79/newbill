import fs from "node:fs";
import path from "node:path";

const API_ROOT = path.join(process.cwd(), "src", "app", "api");
const IMPORT_LINE = 'import { withApiErrorHandling } from "@/lib/api-handler";';

function walk(dir: string, out: string[] = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.name === "route.ts") out.push(full);
  }
  return out;
}

function addImport(content: string) {
  if (content.includes('@/lib/api-handler"')) return content;
  const lines = content.split(/\r?\n/);
  let insertAt = -1;
  for (let i = 0; i < lines.length; i++) {
    if (/^import\s/.test(lines[i])) {
      let j = i;
      while (j < lines.length && !/from\s+["']/.test(lines[j])) j += 1;
      if (j < lines.length) insertAt = j + 1;
      i = j;
    }
  }
  if (insertAt >= 0) {
    lines.splice(insertAt, 0, IMPORT_LINE);
    return lines.join("\n");
  }
  return `${IMPORT_LINE}\n${content}`;
}

let fixed = 0;
for (const file of walk(API_ROOT)) {
  let content = fs.readFileSync(file, "utf8");
  const cleaned = content
    .split(/\r?\n/)
    .filter((line) => line.trim() !== IMPORT_LINE)
    .join("\n");
  if (!cleaned.includes("withApiErrorHandling")) continue;
  const next = addImport(cleaned);
  if (next !== content) {
    fs.writeFileSync(file, next);
    fixed += 1;
    console.log(path.relative(process.cwd(), file));
  }
}
console.log(`Fixed imports in ${fixed} files.`);
