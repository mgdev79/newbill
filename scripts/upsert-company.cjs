const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const rows = [
    ["company_name", "Ariyana ID"],
    ["company_address", "Perumahan Kota Baru Keandra"],
    ["company_phone", "087715640895"],
  ];
  for (const [key, value] of rows) {
    await prisma.appSetting.upsert({
      where: { key },
      create: { key, value },
      update: { value },
    });
  }
  console.log("company settings upserted");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
