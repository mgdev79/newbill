import { authorize } from "@/server/aaa";
import { prisma } from "@/lib/db";

async function main() {
  const cases = [
    { username: "budi.s", password: "radius123" },
    { username: "siti.a", password: "radius123" },
    { username: "dewi.l", password: "radius123" },
    { username: "rudi.h", password: "radius123" },
    { username: "budi.s", password: "wrong" },
    { username: "ARIY-8K2P", password: "ARIY-8K2P" },
  ];
  for (const item of cases) {
    const result = await authorize(item);
    console.log(item.username, item.password === "wrong" ? "bad-pass" : "ok", result);
  }
  await prisma.$disconnect();
}

void main();
