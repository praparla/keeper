/**
 * Catalog seed (§11.6) — upserts the suggestion template catalog by slug (idempotent).
 * Runs as an explicit release step, NEVER during the app build (it would mutate prod).
 *   DATABASE_URL=... npx tsx prisma/seed-catalog.ts
 */
import { PrismaClient, Prisma } from "@prisma/client";
import { CATALOG } from "../src/lib/catalog-data";

const prisma = new PrismaClient();

async function main() {
  let count = 0;
  for (const t of CATALOG) {
    const data = {
      title: t.title,
      reasonTemplate: t.reasonTemplate,
      category: t.category,
      triggerType: t.triggerType,
      windowStartMonth: t.windowStartMonth ?? null,
      windowStartDay: t.windowStartDay ?? null,
      windowEndMonth: t.windowEndMonth ?? null,
      windowEndDay: t.windowEndDay ?? null,
      intervalDays: t.intervalDays ?? null,
      intervalAnchor: t.intervalAnchor ?? null,
      leadDays: t.leadDays ?? 14,
      minAge: t.minAge ?? null,
      requiresFacts: (t.gates ?? Prisma.JsonNull) as Prisma.InputJsonValue | typeof Prisma.JsonNull,
      climateSensitive: t.climateSensitive ?? false,
      defaultTaskType: t.defaultTaskType ?? "Household",
      defaultRecurrence: t.defaultRecurrence ?? "NONE",
      sourceUrl: t.sourceUrl,
      active: t.active ?? true,
    };
    await prisma.suggestionTemplate.upsert({
      where: { slug: t.slug },
      update: data,
      create: { slug: t.slug, ...data },
    });
    count += 1;
  }
  const active = CATALOG.filter((t) => t.active ?? true).length;
  console.log(`Seeded ${count} suggestion templates (${active} active by default).`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
