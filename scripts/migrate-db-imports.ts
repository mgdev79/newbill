import fs from "node:fs";
import path from "node:path";

const ROOT = path.join(process.cwd(), "src");

const PLATFORM_PREFIXES = [
  "app/api/v1/saas/",
  "app/api/v1/signup/",
  "app/api/v1/client/",
  "server/platform-gateway",
  "server/tenant-signup.ts",
];

const PLATFORM_EXACT = new Set<string>();

function walk(dir: string, out: string[] = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(entry.name)) out.push(full);
  }
  return out;
}

function rel(file: string) {
  return path.relative(path.join(process.cwd(), "src"), file).replace(/\\/g, "/");
}

function isPlatformFile(file: string) {
  const r = rel(file);
  if (PLATFORM_EXACT.has(r)) return true;
  return PLATFORM_PREFIXES.some((prefix) => r.startsWith(prefix));
}

function migratePlatform(content: string) {
  let next = content;
  next = next.replace(
    /import\s+\{\s*prisma\s*\}\s+from\s+"@\/lib\/db";?/g,
    'import { platformPrisma as prisma } from "@/lib/platform-db";',
  );
  next = next.replace(
    /import\s+\{\s*prisma\s*\}\s+from\s+'@\/lib\/db';?/g,
    "import { platformPrisma as prisma } from '@/lib/platform-db';",
  );
  next = next.replace(/from "@prisma\/client"/g, 'from "@/generated/platform"');
  return next;
}

function injectGetDb(content: string) {
  let next = content.replace(
    /import\s+\{\s*prisma\s*\}\s+from\s+"@\/lib\/db";?/g,
    'import { getDb } from "@/lib/db";',
  );
  next = next.replace(
    /import\s+\{\s*prisma\s*\}\s+from\s+'@\/lib\/db';?/g,
    "import { getDb } from '@/lib/db';",
  );
  next = next.replace(/from "@prisma\/client"/g, 'from "@/generated/tenant"');

  next = next.replace(
    /export async function (\w+)\([^)]*\)\s*\{/g,
    (match, name, offset, whole) => {
      const after = whole.slice(offset + match.length, offset + match.length + 120);
      if (/const prisma = await getDb\(\)/.test(after)) return match;
      return `${match}\n  const prisma = await getDb();`;
    },
  );

  next = next.replace(
    /export async function (\w+)\(\)\s*\{/g,
    (match, _name, offset, whole) => {
      const after = whole.slice(offset + match.length, offset + match.length + 120);
      if (/const prisma = await getDb\(\)/.test(after)) return match;
      return `${match}\n  const prisma = await getDb();`;
    },
  );

  // Standalone async helpers that use prisma directly
  next = next.replace(
    /^export async function (run\w+|ping\w+|write\w+|sync\w+|get\w+|set\w+|test\w+|ensure\w+|activate\w+)\([^)]*\)\s*\{/gm,
    (match, _name, offset, whole) => {
      if (!whole.includes("getDb")) return match;
      const after = whole.slice(offset + match.length, offset + match.length + 120);
      if (/const prisma = await getDb\(\)/.test(after)) return match;
      return `${match}\n  const prisma = await getDb();`;
    },
  );

  return next;
}

function migrateMixedSaas(content: string, file: string) {
  // saas.ts uses both platform and tenant concepts
  if (file.endsWith("lib/saas.ts")) {
    return content
      .replace(
        /import\s+\{\s*prisma\s*\}\s+from\s+"@\/lib\/db";?/,
        `import { platformPrisma } from "@/lib/platform-db";\nimport { getDb } from "@/lib/db";\nimport { getTenantCode } from "@/lib/tenant-context";`,
      )
      .replace(/return prisma\.tenant\./g, "return platformPrisma.tenant.")
      .replace(/await prisma\.appSetting/g, "// removed billing tenant from tenant db")
      .replace(/prisma\.tenant\./g, "platformPrisma.tenant.");
  }
  if (file.endsWith("lib/billing.ts")) {
    return content
      .replace(
        /import\s+\{\s*prisma\s*\}\s+from\s+"@\/lib\/db";?/,
        'import { getDb } from "@/lib/db";',
      )
      .replace(
        /export async function getCompanyProfile\(\) \{/,
        "export async function getCompanyProfile() {\n  const prisma = await getDb();",
      );
  }
  return null;
}

const files = walk(ROOT).filter((f) => {
  const text = fs.readFileSync(f, "utf8");
  return text.includes('@/lib/db"') || text.includes("@/lib/db'");
});

let changed = 0;
for (const file of files) {
  const original = fs.readFileSync(file, "utf8");
  const mixed = migrateMixedSaas(original, file);
  if (mixed) {
    if (mixed !== original) {
      fs.writeFileSync(file, mixed);
      changed += 1;
      console.log("mixed", rel(file));
    }
    continue;
  }

  const next = isPlatformFile(file) ? migratePlatform(original) : injectGetDb(original);
  if (next !== original) {
    fs.writeFileSync(file, next);
    changed += 1;
    console.log(isPlatformFile(file) ? "platform" : "tenant", rel(file));
  }
}

console.log(`Updated ${changed} files.`);
