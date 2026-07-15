"use server";

import { prisma } from "@/lib/db";
import { AuthorizationError, requireCircleContext, requireRecipient } from "@/lib/access";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const idSchema = z.string().min(1, "ID is required");

const conditionSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(160),
  notes: z.string().max(4000).optional(),
  active: z.boolean().optional(),
});

async function requireCondition(id: string, circleId: string) {
  const condition = await prisma.condition.findFirst({
    where: { id, recipient: { circleId } },
  });
  if (!condition) throw new AuthorizationError("Condition not found in your circle");
  return condition;
}

export async function getConditions(recipientId: string) {
  const validId = idSchema.parse(recipientId);
  const { circleId } = await requireCircleContext();
  await requireRecipient(validId, circleId);
  return prisma.condition.findMany({
    where: { recipientId: validId },
    orderBy: [{ active: "desc" }, { name: "asc" }],
  });
}

export async function createCondition(
  recipientId: string,
  data: { name: string; notes?: string; active?: boolean },
) {
  const validRecipientId = idSchema.parse(recipientId);
  const v = conditionSchema.parse(data);
  const { circleId } = await requireCircleContext();
  await requireRecipient(validRecipientId, circleId);

  const condition = await prisma.condition.create({
    data: {
      recipientId: validRecipientId,
      name: v.name,
      notes: v.notes || null,
      active: v.active ?? true,
    },
  });

  revalidatePath("/parents");
  return condition;
}

export async function updateCondition(
  id: string,
  data: { name?: string; notes?: string; active?: boolean },
) {
  const validId = idSchema.parse(id);
  const v = conditionSchema.partial().parse(data);
  const { circleId } = await requireCircleContext();
  await requireCondition(validId, circleId);

  const condition = await prisma.condition.update({
    where: { id: validId },
    data: {
      ...(v.name !== undefined ? { name: v.name } : {}),
      ...(v.notes !== undefined ? { notes: v.notes || null } : {}),
      ...(v.active !== undefined ? { active: v.active } : {}),
    },
  });

  revalidatePath("/parents");
  return condition;
}

export async function deleteCondition(id: string) {
  const validId = idSchema.parse(id);
  const { circleId } = await requireCircleContext();
  await requireCondition(validId, circleId);
  await prisma.condition.delete({ where: { id: validId } });
  revalidatePath("/parents");
}
