import fs from "node:fs";
import path from "node:path";

const serverDir = path.join(process.cwd(), "src", "server");
const extra = [
  path.join(process.cwd(), "src", "app", "api", "v1", "script-generator", "route.ts"),
];

function fixFile(file: string) {
  let content = fs.readFileSync(file, "utf8");
  if (!content.includes("getDb") || !content.includes("prisma.")) return false;

  const fnRegex = /(async function \w+\([^)]*\)\s*\{|async \(\) => \{)/g;
  let changed = false;
  const parts: string[] = [];
  let last = 0;
  let match: RegExpExecArray | null;

  while ((match = fnRegex.exec(content))) {
    const start = match.index + match[0].length;
    const slice = content.slice(start, start + 160);
    if (!content.slice(match.index, start + 800).includes("prisma.")) continue;
    if (/const prisma = await getDb\(\)/.test(slice)) continue;

    parts.push(content.slice(last, start));
    parts.push("\n  const prisma = await getDb();");
    last = start;
    changed = true;
  }

  if (!changed) return false;
  parts.push(content.slice(last));
  fs.writeFileSync(file, parts.join(""));
  return true;
}

const files = fs
  .readdirSync(serverDir)
  .filter((f) => f.endsWith(".ts"))
  .map((f) => path.join(serverDir, f))
  .concat(extra);

let count = 0;
for (const file of files) {
  if (fixFile(file)) {
    count += 1;
    console.log("fixed", path.relative(process.cwd(), file));
  }
}
console.log(`Fixed ${count} files.`);
