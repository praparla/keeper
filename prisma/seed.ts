import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Seed users (family members)
  const pranava = await prisma.user.upsert({
    where: { email: "pranava@family.dev" },
    update: {},
    create: {
      name: "Pranava",
      email: "pranava@family.dev",
      phoneNumber: "+15550001",
    },
  });

  const sibling1 = await prisma.user.upsert({
    where: { email: "sibling1@family.dev" },
    update: {},
    create: {
      name: "Sibling 1",
      email: "sibling1@family.dev",
      phoneNumber: "+15550002",
    },
  });

  const sibling2 = await prisma.user.upsert({
    where: { email: "sibling2@family.dev" },
    update: {},
    create: {
      name: "Sibling 2",
      email: "sibling2@family.dev",
      phoneNumber: "+15550003",
    },
  });

  console.log("Seeded users:", pranava.name, sibling1.name, sibling2.name);

  // Seed Vital Info
  const vitalInfoData = [
    {
      category: "Medications",
      content:
        "Lisinopril 10mg (daily, morning)\nMetformin 500mg (twice daily with meals)\nAspirin 81mg (daily)",
    },
    {
      category: "Allergies",
      content: "Penicillin — causes rash\nSulfa drugs — causes nausea",
    },
    {
      category: "Doctors",
      content:
        "Dr. Smith (Primary Care) — (555) 100-2000\nDr. Patel (Cardiologist) — (555) 100-3000\nDr. Lee (Endocrinologist) — (555) 100-4000",
    },
    {
      category: "Insurance",
      content:
        "Medicare Part A & B\nSupplemental: Blue Cross Plan F\nMember ID: ABC123456789",
    },
    {
      category: "Emergency Contacts",
      content:
        "Pranava — (555) 000-1111\nSibling 1 — (555) 000-2222\nSibling 2 — (555) 000-3333",
    },
  ];

  for (const info of vitalInfoData) {
    // Delete existing then create fresh (idempotent seed)
    await prisma.vitalInfo.deleteMany({ where: { category: info.category } });
    await prisma.vitalInfo.create({ data: info });
  }

  console.log("Seeded vital info");

  // Seed some example tasks
  const tasks = [
    {
      title: "Schedule annual physical",
      type: "Medical" as const,
      status: "Open" as const,
      creatorId: pranava.id,
    },
    {
      title: "Pick up prescription from CVS",
      type: "Errand" as const,
      status: "Open" as const,
      creatorId: sibling1.id,
    },
    {
      title: "Fix leaky kitchen faucet",
      type: "Household" as const,
      status: "InProgress" as const,
      assigneeId: sibling2.id,
      creatorId: pranava.id,
    },
    {
      title: "Mom prefers morning appointments",
      type: "Note" as const,
      status: "Open" as const,
      creatorId: pranava.id,
    },
    {
      title: "Cardiology follow-up completed",
      description: "Dr. Patel says everything looks good. Next visit in 6 months.",
      type: "Medical" as const,
      status: "Resolved" as const,
      assigneeId: pranava.id,
      creatorId: pranava.id,
    },
  ];

  for (const task of tasks) {
    await prisma.task.create({ data: task });
  }

  console.log("Seeded tasks");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
