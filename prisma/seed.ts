import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const users = await Promise.all(
    [
      ["seed-pranava", "Pranava", "pranava@family.dev", "teal"],
      ["seed-sibling-1", "Sibling 1", "sibling1@family.dev", "blue"],
      ["seed-sibling-2", "Sibling 2", "sibling2@family.dev", "orange"],
    ].map(([id, name, email, color]) =>
      prisma.user.upsert({
        where: { email },
        update: { name, color },
        create: { id, name, email, color },
      }),
    ),
  );
  const [pranava, sibling1, sibling2] = users;

  const circle = await prisma.careCircle.upsert({
    where: { id: "seed-family-circle" },
    update: { name: "Family" },
    create: { id: "seed-family-circle", name: "Family" },
  });

  await Promise.all(
    users.map((user, index) =>
      prisma.membership.upsert({
        where: { userId_circleId: { userId: user.id, circleId: circle.id } },
        update: { role: index === 0 ? "OWNER" : "MEMBER" },
        create: { userId: user.id, circleId: circle.id, role: index === 0 ? "OWNER" : "MEMBER" },
      }),
    ),
  );

  const vitalInfo = [
    ["Medications", "Lisinopril 10mg (daily, morning)\nMetformin 500mg (twice daily with meals)\nAspirin 81mg (daily)"],
    ["Allergies", "Penicillin — causes rash\nSulfa drugs — causes nausea"],
    ["Doctors", "Dr. Smith (Primary Care) — (555) 100-2000\nDr. Patel (Cardiologist) — (555) 100-3000"],
    ["Insurance", "Medicare Part A & B\nSupplemental: Blue Cross Plan F\nMember ID: ABC123456789"],
    ["Emergency Contacts", "Pranava — (555) 000-1111\nSibling 1 — (555) 000-2222"],
  ];
  for (const [category, content] of vitalInfo) {
    await prisma.vitalInfo.upsert({
      where: { circleId_category: { circleId: circle.id, category } },
      update: { content },
      create: { circleId: circle.id, category, content },
    });
  }

  await prisma.task.deleteMany({ where: { circleId: circle.id } });
  await prisma.task.createMany({
    data: [
      { circleId: circle.id, title: "Schedule annual physical", type: "Medical", creatorId: pranava.id },
      { circleId: circle.id, title: "Pick up prescription from CVS", type: "Errand", creatorId: sibling1.id },
      { circleId: circle.id, title: "Fix leaky kitchen faucet", type: "Household", status: "InProgress", assigneeId: sibling2.id, creatorId: pranava.id },
      { circleId: circle.id, title: "Mom prefers morning appointments", type: "Note", creatorId: pranava.id },
      { circleId: circle.id, title: "Cardiology follow-up completed", description: "Dr. Patel says everything looks good. Next visit in 6 months.", type: "Medical", status: "Resolved", assigneeId: pranava.id, creatorId: pranava.id },
    ],
  });

  console.log(`Seeded ${users.length} users in ${circle.name}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
