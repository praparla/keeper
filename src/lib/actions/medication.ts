"use server";

import { prisma } from "@/lib/db";
import { AuthorizationError, requireCircleContext, requireRecipient } from "@/lib/access";
import { revalidatePath } from "next/cache";
import { TaskStatus } from "@prisma/client";
import { z } from "zod";

const idSchema = z.string().min(1, "ID is required");

const medicationSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(160),
  dose: z.string().trim().max(80).optional(),
  schedule: z.string().trim().max(160).optional(),
  pharmacy: z.string().trim().max(160).optional(),
  prescriberId: z.string().min(1).nullable().optional(),
  refillIntervalDays: z.number().int().gte(1).lte(365).nullable().optional(),
  lastFilledAt: z.string().refine((v) => !v || !Number.isNaN(Date.parse(v)), "Invalid date").nullable().optional(),
  defaultAssigneeId: z.string().min(1).nullable().optional(),
  notes: z.string().max(4000).optional(),
  active: z.boolean().optional(),
});

async function requireMedication(id: string, circleId: string) {
  const med = await prisma.medication.findFirst({
    where: { id, recipient: { circleId } },
  });
  if (!med) throw new AuthorizationError("Medication not found in your circle");
  return med;
}

/** Guard that an optional prescriber belongs to the same recipient. */
async function validatePrescriber(prescriberId: string | null | undefined, recipientId: string) {
  if (!prescriberId) return;
  const provider = await prisma.provider.findFirst({
    where: { id: prescriberId, recipientId },
    select: { id: true },
  });
  if (!provider) throw new AuthorizationError("Prescriber is not a provider for this recipient");
}

/** Guard that an optional default assignee is a member of the circle. */
async function validateAssignee(assigneeId: string | null | undefined, circleId: string) {
  if (!assigneeId) return;
  const membership = await prisma.membership.findUnique({
    where: { userId_circleId: { userId: assigneeId, circleId } },
    select: { id: true },
  });
  if (!membership) throw new AuthorizationError("Assignee is not in your circle");
}

export async function getMedications(recipientId: string, includeInactive = false) {
  const validId = idSchema.parse(recipientId);
  const { circleId } = await requireCircleContext();
  await requireRecipient(validId, circleId);
  return prisma.medication.findMany({
    where: { recipientId: validId, ...(includeInactive ? {} : { active: true }) },
    include: { prescriber: true, defaultAssignee: true },
    orderBy: [{ active: "desc" }, { name: "asc" }],
  });
}

export async function createMedication(
  recipientId: string,
  data: z.input<typeof medicationSchema>,
) {
  const validRecipientId = idSchema.parse(recipientId);
  const v = medicationSchema.parse(data);
  const { circleId } = await requireCircleContext();
  await requireRecipient(validRecipientId, circleId);
  await validatePrescriber(v.prescriberId, validRecipientId);
  await validateAssignee(v.defaultAssigneeId, circleId);

  const med = await prisma.medication.create({
    data: {
      recipientId: validRecipientId,
      name: v.name,
      dose: v.dose || null,
      schedule: v.schedule || null,
      pharmacy: v.pharmacy || null,
      prescriberId: v.prescriberId ?? null,
      refillIntervalDays: v.refillIntervalDays ?? null,
      lastFilledAt: v.lastFilledAt ? new Date(v.lastFilledAt) : null,
      defaultAssigneeId: v.defaultAssigneeId ?? null,
      notes: v.notes || null,
      active: v.active ?? true,
    },
  });

  revalidatePath("/parents");
  return med;
}

export async function updateMedication(id: string, data: z.input<typeof medicationSchema>) {
  const validId = idSchema.parse(id);
  const v = medicationSchema.partial().parse(data);
  const { circleId } = await requireCircleContext();
  const existing = await requireMedication(validId, circleId);
  await validatePrescriber(v.prescriberId, existing.recipientId);
  await validateAssignee(v.defaultAssigneeId, circleId);

  const med = await prisma.medication.update({
    where: { id: validId },
    data: {
      ...(v.name !== undefined ? { name: v.name } : {}),
      ...(v.dose !== undefined ? { dose: v.dose || null } : {}),
      ...(v.schedule !== undefined ? { schedule: v.schedule || null } : {}),
      ...(v.pharmacy !== undefined ? { pharmacy: v.pharmacy || null } : {}),
      ...(v.prescriberId !== undefined ? { prescriberId: v.prescriberId ?? null } : {}),
      ...(v.refillIntervalDays !== undefined ? { refillIntervalDays: v.refillIntervalDays ?? null } : {}),
      ...(v.lastFilledAt !== undefined ? { lastFilledAt: v.lastFilledAt ? new Date(v.lastFilledAt) : null } : {}),
      ...(v.defaultAssigneeId !== undefined ? { defaultAssigneeId: v.defaultAssigneeId ?? null } : {}),
      ...(v.notes !== undefined ? { notes: v.notes || null } : {}),
      ...(v.active !== undefined ? { active: v.active } : {}),
    },
  });

  revalidatePath("/parents");
  return med;
}

/** Deactivating stops future refill tasks and drops the med from the ER active list. */
export async function setMedicationActive(id: string, active: boolean) {
  const validId = idSchema.parse(id);
  const { circleId } = await requireCircleContext();
  await requireMedication(validId, circleId);
  const med = await prisma.medication.update({ where: { id: validId }, data: { active } });
  revalidatePath("/parents");
  return med;
}

/**
 * "Mark filled" — resets the refill cycle and resolves any open refill task for
 * this med. Callable from the med row or the refill task (§6.4, §7.2 2-tap budget).
 */
export async function markMedicationFilled(id: string, filledAt?: string) {
  const validId = idSchema.parse(id);
  const { circleId } = await requireCircleContext();
  await requireMedication(validId, circleId);

  const when = filledAt ? new Date(filledAt) : new Date();
  if (Number.isNaN(when.getTime())) throw new Error("Invalid date");

  const [med] = await prisma.$transaction([
    prisma.medication.update({ where: { id: validId }, data: { lastFilledAt: when } }),
    prisma.task.updateMany({
      where: { medicationId: validId, status: { not: TaskStatus.Resolved } },
      data: { status: TaskStatus.Resolved },
    }),
  ]);

  revalidatePath("/parents");
  revalidatePath("/dashboard");
  return med;
}

export async function deleteMedication(id: string) {
  const validId = idSchema.parse(id);
  const { circleId } = await requireCircleContext();
  await requireMedication(validId, circleId);
  await prisma.medication.delete({ where: { id: validId } });
  revalidatePath("/parents");
}
