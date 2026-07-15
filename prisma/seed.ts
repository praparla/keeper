import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DAY = 24 * 60 * 60 * 1000;

async function main() {
  const users = await Promise.all(
    [
      ["seed-pranava", "Pranava", "pranava@family.dev", "moss"],
      ["seed-sibling-1", "Sibling 1", "sibling1@family.dev", "clay"],
      ["seed-sibling-2", "Sibling 2", "sibling2@family.dev", "ochre"],
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

  // ── Care recipient: Mom ──
  const mom = await prisma.careRecipient.upsert({
    where: { id: "seed-recipient-mom" },
    update: { name: "Margaret", relationship: "Mom", birthYear: 1948, zip: "20147", residenceType: "HOUSE" },
    create: {
      id: "seed-recipient-mom",
      circleId: circle.id,
      name: "Margaret",
      relationship: "Mom",
      birthYear: 1948,
      zip: "20147",
      residenceType: "HOUSE",
    },
  });

  const facts: Array<[string, string]> = [
    ["hasLawn", "true"], ["hasDriveway", "true"], ["hasGutters", "true"], ["hasFireplace", "true"],
    ["hasCar", "true"], ["hasStairs", "true"], ["livesAlone", "true"], ["hasBasement", "true"],
    ["hasWindowAC", "false"], ["hasPets", "false"],
    ["drives", "true"], ["hasDiabetes", "true"], ["hasHeartCondition", "false"],
    ["enrolledMedicareAdvantage", "false"], ["hasRetirementAccounts", "true"],
  ];
  for (const [key, value] of facts) {
    await prisma.profileFact.upsert({
      where: { recipientId_key: { recipientId: mom.id, key } },
      update: { value, source: "ONBOARDING" },
      create: { recipientId: mom.id, key, value, source: "ONBOARDING" },
    });
  }

  const drSmith = await prisma.provider.upsert({
    where: { id: "seed-provider-smith" },
    update: { name: "Dr. Smith", specialty: "Primary Care", phone: "(555) 100-2000" },
    create: { id: "seed-provider-smith", recipientId: mom.id, name: "Dr. Smith", specialty: "Primary Care", phone: "(555) 100-2000" },
  });
  const drPatel = await prisma.provider.upsert({
    where: { id: "seed-provider-patel" },
    update: { name: "Dr. Patel", specialty: "Cardiology", phone: "(555) 100-3000" },
    create: { id: "seed-provider-patel", recipientId: mom.id, name: "Dr. Patel", specialty: "Cardiology", phone: "(555) 100-3000" },
  });

  await prisma.condition.upsert({
    where: { id: "seed-condition-diabetes" },
    update: { name: "Type 2 diabetes", active: true },
    create: { id: "seed-condition-diabetes", recipientId: mom.id, name: "Type 2 diabetes", active: true },
  });

  // A med whose refill is due soon (lastFilled 26 days ago, 30-day interval, 7-day lead → due now).
  await prisma.medication.upsert({
    where: { id: "seed-med-metformin" },
    update: { name: "Metformin", dose: "500mg", schedule: "twice daily with meals", pharmacy: "CVS Main St", refillIntervalDays: 30, lastFilledAt: new Date(Date.now() - 26 * DAY), prescriberId: drSmith.id, defaultAssigneeId: pranava.id },
    create: { id: "seed-med-metformin", recipientId: mom.id, name: "Metformin", dose: "500mg", schedule: "twice daily with meals", pharmacy: "CVS Main St", refillIntervalDays: 30, lastFilledAt: new Date(Date.now() - 26 * DAY), prescriberId: drSmith.id, defaultAssigneeId: pranava.id },
  });
  await prisma.medication.upsert({
    where: { id: "seed-med-lisinopril" },
    update: { name: "Lisinopril", dose: "10mg", schedule: "daily, morning", pharmacy: "CVS Main St", refillIntervalDays: 90, lastFilledAt: new Date(Date.now() - 10 * DAY), prescriberId: drPatel.id },
    create: { id: "seed-med-lisinopril", recipientId: mom.id, name: "Lisinopril", dose: "10mg", schedule: "daily, morning", pharmacy: "CVS Main St", refillIntervalDays: 90, lastFilledAt: new Date(Date.now() - 10 * DAY), prescriberId: drPatel.id },
  });

  await prisma.appointment.upsert({
    where: { id: "seed-appt-cardiology" },
    update: { title: "Cardiology follow-up", startsAt: new Date(Date.now() + 5 * DAY), providerId: drPatel.id, attendeeId: pranava.id, location: "Reston Medical Center" },
    create: { id: "seed-appt-cardiology", recipientId: mom.id, title: "Cardiology follow-up", startsAt: new Date(Date.now() + 5 * DAY), providerId: drPatel.id, attendeeId: pranava.id, location: "Reston Medical Center" },
  });

  const vitalInfo: Array<[string, string]> = [
    ["Allergies", "Penicillin — causes rash\nSulfa drugs — causes nausea"],
    ["Insurance", "Medicare Part A & B\nSupplemental: Blue Cross Plan F\nMember ID: ABC123456789"],
    ["Emergency Contacts", "Pranava — (555) 000-1111\nSibling 1 — (555) 000-2222"],
  ];
  for (const [category, content] of vitalInfo) {
    await prisma.vitalInfo.upsert({
      where: { recipientId_category: { recipientId: mom.id, category } },
      update: { content },
      create: { recipientId: mom.id, category, content },
    });
  }

  // Non-refill tasks are recreated each seed; refill-generated tasks (medicationId set) are left alone.
  await prisma.task.deleteMany({ where: { circleId: circle.id, medicationId: null } });
  await prisma.task.createMany({
    data: [
      { circleId: circle.id, recipientId: mom.id, title: "Schedule annual physical", type: "Medical", creatorId: pranava.id },
      { circleId: circle.id, recipientId: mom.id, title: "Pick up prescription from CVS", type: "Errand", creatorId: sibling1.id },
      { circleId: circle.id, title: "Fix leaky kitchen faucet", type: "Household", status: "InProgress", assigneeId: sibling2.id, creatorId: pranava.id },
      { circleId: circle.id, recipientId: mom.id, title: "Mom prefers morning appointments", type: "Note", creatorId: pranava.id },
      { circleId: circle.id, recipientId: mom.id, title: "Change furnace filter", type: "Household", recurrence: "MONTHLY", dueDate: new Date(Date.now() - 2 * DAY), priority: true, creatorId: pranava.id },
      { circleId: circle.id, recipientId: mom.id, title: "Cardiology follow-up completed", description: "Dr. Patel says everything looks good. Next visit in 6 months.", type: "Medical", status: "Resolved", assigneeId: pranava.id, creatorId: pranava.id },
    ],
  });

  console.log(`Seeded ${users.length} users, 1 recipient (${mom.name}) in ${circle.name}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
