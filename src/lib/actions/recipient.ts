"use server";

import { prisma } from "@/lib/db";
import { requireCircleContext, requireRecipient } from "@/lib/access";
import { revalidatePath } from "next/cache";
import { ResidenceType, FactSource } from "@prisma/client";
import { z } from "zod";
import { regionForZip } from "@/lib/climate";
import { isKnownFactKey, isFactValue, defaultFactsFor, ALL_FACTS } from "@/lib/facts";
import { CATALOG } from "@/lib/catalog-data";
import { sweepCircle } from "@/lib/jobs/sweep";

/** Re-run the engine after a profile change so suggestions reflect it immediately (§11.3). */
async function regenerate(circleId: string) {
  try {
    await sweepCircle(circleId);
  } catch (error) {
    console.error("suggestion sweep after profile change failed", error);
  }
}

const RESIDENCE_TYPES = ["HOUSE", "CONDO", "APARTMENT", "FACILITY"] as const;
const idSchema = z.string().min(1, "ID is required");

const recipientSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  relationship: z.string().trim().max(60).optional(),
  birthYear: z.number().int().gte(1900).lte(new Date().getFullYear()).nullable().optional(),
  zip: z.string().trim().max(10).optional(),
  residenceType: z.enum(RESIDENCE_TYPES).nullable().optional(),
  timezone: z.string().trim().max(60).optional(),
});

export async function getRecipients() {
  const { circleId } = await requireCircleContext();
  return prisma.careRecipient.findMany({
    where: { circleId },
    orderBy: { createdAt: "asc" },
  });
}

export async function getRecipient(id: string) {
  const validId = idSchema.parse(id);
  const { circleId } = await requireCircleContext();
  return prisma.careRecipient.findFirst({
    where: { id: validId, circleId },
  });
}

export async function createRecipient(data: {
  name: string;
  relationship?: string;
  birthYear?: number | null;
  zip?: string;
  residenceType?: ResidenceType | null;
  timezone?: string;
}) {
  const v = recipientSchema.parse(data);
  const { circleId } = await requireCircleContext();

  const recipient = await prisma.careRecipient.create({
    data: {
      circleId,
      name: v.name,
      relationship: v.relationship || null,
      birthYear: v.birthYear ?? null,
      zip: v.zip || null,
      climateRegion: regionForZip(v.zip), // derived, overridable on "What Keeper knows"
      residenceType: v.residenceType ?? null,
      ...(v.timezone ? { timezone: v.timezone } : {}),
    },
  });

  // Seed the fact table with residence-appropriate defaults so the engine and the
  // "What Keeper knows" screen have a complete row set from day one.
  const defaults = defaultFactsFor(recipient.residenceType);
  await prisma.profileFact.createMany({
    data: ALL_FACTS.map((f) => ({
      recipientId: recipient.id,
      key: f.key,
      value: defaults[f.key],
      source: FactSource.DEFAULT,
    })),
    skipDuplicates: true,
  });

  await regenerate(circleId);
  revalidatePath("/parents");
  return recipient;
}

export async function updateRecipient(
  id: string,
  data: {
    name?: string;
    relationship?: string;
    birthYear?: number | null;
    zip?: string;
    residenceType?: ResidenceType | null;
    timezone?: string;
  },
) {
  const validId = idSchema.parse(id);
  const v = recipientSchema.partial().parse(data);
  const { circleId } = await requireCircleContext();
  await requireRecipient(validId, circleId);

  const recipient = await prisma.careRecipient.update({
    where: { id: validId },
    data: {
      ...(v.name !== undefined ? { name: v.name } : {}),
      ...(v.relationship !== undefined ? { relationship: v.relationship || null } : {}),
      ...(v.birthYear !== undefined ? { birthYear: v.birthYear ?? null } : {}),
      ...(v.zip !== undefined ? { zip: v.zip || null, climateRegion: regionForZip(v.zip) } : {}),
      ...(v.residenceType !== undefined ? { residenceType: v.residenceType ?? null } : {}),
      ...(v.timezone !== undefined ? { timezone: v.timezone } : {}),
    },
  });

  revalidatePath("/parents");
  return recipient;
}

export async function deleteRecipient(id: string) {
  const validId = idSchema.parse(id);
  const { circleId } = await requireCircleContext();
  await requireRecipient(validId, circleId);
  // Cascades to facts, providers, conditions, meds, appointments, vital info, tasks.
  await prisma.careRecipient.delete({ where: { id: validId } });
  revalidatePath("/parents");
}

/** "What Keeper knows" — every fact with its provenance. */
export async function getFacts(recipientId: string) {
  const validId = idSchema.parse(recipientId);
  const { circleId } = await requireCircleContext();
  await requireRecipient(validId, circleId);
  return prisma.profileFact.findMany({
    where: { recipientId: validId },
    orderBy: { key: "asc" },
  });
}

/** Set a single fact. A member correction is a MANUAL source and feeds the next engine run. */
export async function setFact(
  recipientId: string,
  key: string,
  value: string,
  source: FactSource = FactSource.MANUAL,
) {
  const validId = idSchema.parse(recipientId);
  if (!isKnownFactKey(key)) throw new Error(`Unknown fact key: ${key}`);
  if (!isFactValue(value)) throw new Error(`Invalid fact value: ${value}`);
  const { circleId } = await requireCircleContext();
  await requireRecipient(validId, circleId);

  const fact = await prisma.profileFact.upsert({
    where: { recipientId_key: { recipientId: validId, key } },
    update: { value, source },
    create: { recipientId: validId, key, value, source },
  });

  // Correcting a fact by hand drops suppressions on templates gated by it (§11.3), so
  // a suggestion the user dismissed as "not applicable" can resurface once the fact changes.
  if (source === FactSource.MANUAL) {
    const dependentSlugs = CATALOG.filter((t) => t.gates?.facts && key in t.gates.facts).map((t) => t.slug);
    if (dependentSlugs.length) {
      await prisma.suggestionSuppression.deleteMany({
        where: { recipientId: validId, templateSlug: { in: dependentSlugs } },
      });
    }
  }

  await regenerate(circleId);
  revalidatePath("/parents");
  return fact;
}

/** Bulk-set facts from onboarding (one write per recipient). */
export async function setFacts(recipientId: string, facts: Record<string, string>) {
  const validId = idSchema.parse(recipientId);
  const { circleId } = await requireCircleContext();
  await requireRecipient(validId, circleId);

  const entries = Object.entries(facts).filter(
    ([key, value]) => isKnownFactKey(key) && isFactValue(value),
  );

  await prisma.$transaction(
    entries.map(([key, value]) =>
      prisma.profileFact.upsert({
        where: { recipientId_key: { recipientId: validId, key } },
        update: { value, source: FactSource.ONBOARDING },
        create: { recipientId: validId, key, value, source: FactSource.ONBOARDING },
      }),
    ),
  );

  await regenerate(circleId);
  revalidatePath("/parents");
}
