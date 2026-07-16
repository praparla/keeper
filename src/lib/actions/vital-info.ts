"use server";

import { prisma } from "@/lib/db";
import { AuthorizationError, requireCircleContext, requireRecipient } from "@/lib/access";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const categorySchema = z.string().trim().min(1, "Category is required").max(200);
const contentSchema = z.string().max(10000);
const idSchema = z.string().min(1, "ID is required");

export async function getVitalInfo(recipientId: string) {
  const validId = idSchema.parse(recipientId);
  const { circleId } = await requireCircleContext();
  await requireRecipient(validId, circleId);
  return prisma.vitalInfo.findMany({
    where: { recipientId: validId },
    orderBy: { category: "asc" },
  });
}

export async function getVitalInfoByCategory(recipientId: string, category: string) {
  const validId = idSchema.parse(recipientId);
  const validCategory = categorySchema.parse(category);
  const { circleId } = await requireCircleContext();
  await requireRecipient(validId, circleId);
  return prisma.vitalInfo.findUnique({
    where: { recipientId_category: { recipientId: validId, category: validCategory } },
  });
}

export async function upsertVitalInfo(recipientId: string, category: string, content: string) {
  const validId = idSchema.parse(recipientId);
  const validCategory = categorySchema.parse(category);
  const validContent = contentSchema.parse(content);
  const { circleId } = await requireCircleContext();
  await requireRecipient(validId, circleId);

  const result = await prisma.vitalInfo.upsert({
    where: { recipientId_category: { recipientId: validId, category: validCategory } },
    update: { content: validContent },
    create: { recipientId: validId, category: validCategory, content: validContent },
  });

  revalidatePath("/parents");
  return result;
}

export async function deleteVitalInfo(id: string) {
  const validId = idSchema.parse(id);
  const { circleId } = await requireCircleContext();
  const item = await prisma.vitalInfo.findFirst({
    where: { id: validId, recipient: { circleId } },
  });
  if (!item) throw new AuthorizationError("Health info not found in your circle");
  await prisma.vitalInfo.delete({ where: { id: validId } });
  revalidatePath("/parents");
}
