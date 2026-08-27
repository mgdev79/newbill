import fs from "node:fs";
import path from "node:path";

const API_ROOT = path.join(process.cwd(), "src", "app", "api");
const HANDLER_METHODS = new Set(["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"]);
const IMPORT_LINE = 'import { withApiErrorHandling } from "@/lib/api-handler";';

function walk(dir: string, out: string[] = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.name === "route.ts") out.push(full);
  }
  return out;
}

function findMatchingBrace(content: string, openIndex: number) {
  let depth = 0;
  for (let i = openIndex; i < content.length; i++) {
    const ch = content[i];
    if (ch === "{") depth += 1;
    else if (ch === "}") {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  return -1;
}

function findMatchingParen(content: string, openIndex: number) {
  let depth = 0;
  for (let i = openIndex; i < content.length; i++) {
    const ch = content[i];
    if (ch === "(") depth += 1;
    else if (ch === ")") {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  return -1;
}

function findFunctionBodyStart(content: string, fnStart: number) {
  const parenStart = content.indexOf("(", fnStart);
  if (parenStart < 0) return -1;
  const parenEnd = findMatchingParen(content, parenStart);
  if (parenEnd < 0) return -1;
  for (let i = parenEnd + 1; i < content.length; i++) {
    const ch = content[i];
    if (ch === "{") return i;
    if (!/\s/.test(ch)) return -1;
  }
  return -1;
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

function wrapRouteHandlers(content: string) {
  if (content.includes('@/lib/api-handler"')) return content;

  const regex = /^export async function (GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\b/gm;
  let result = "";
  let cursor = 0;
  let match: RegExpExecArray | null;
  let wrapped = 0;

  while ((match = regex.exec(content))) {
    const method = match[1];
    if (!HANDLER_METHODS.has(method)) continue;

    const fnStart = match.index;
    const bodyStart = findFunctionBodyStart(content, fnStart);
    if (bodyStart < 0) continue;

    const bodyEnd = findMatchingBrace(content, bodyStart);
    if (bodyEnd < 0) continue;

    result += content.slice(cursor, fnStart);
    const fnText = content.slice(fnStart, bodyEnd + 1);
    const wrappedFn = fnText.replace(
      /^export async function (GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)/,
      "export const $1 = withApiErrorHandling(async function $1",
    );
    result += `${wrappedFn});`;
    cursor = bodyEnd + 1;
    wrapped += 1;
  }

  if (wrapped === 0) return content;
  result += content.slice(cursor);
  return addImport(result);
}

const files = walk(API_ROOT);
let changed = 0;
for (const file of files) {
  const original = fs.readFileSync(file, "utf8");
  const next = wrapRouteHandlers(original);
  if (next !== original) {
    fs.writeFileSync(file, next);
    changed += 1;
    console.log(path.relative(process.cwd(), file));
  }
}
console.log(`Wrapped handlers in ${changed} route files.`);
