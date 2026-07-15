"use server";

import { prisma } from "@/lib/db";
import { AuthorizationError, requireCircleContext, vitalInfoInCircle } from "@/lib/access";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const categorySchema = z.string().trim().min(1, "Category is required").max(200);
const contentSchema = z.string().max(10000);
const idSchema = z.string().min(1, "ID is required");

export async function getVitalInfo() {
  const { circleId } = await requireCircleContext();
  return prisma.vitalInfo.findMany({
    where: { circleId },
    orderBy: { category: "asc" },
  });
}

export async function getVitalInfoByCategory(category: string) {
  const validCategory = categorySchema.parse(category);
  const { circleId } = await requireCircleContext();
  return prisma.vitalInfo.findUnique({
    where: { circleId_category: { circleId, category: validCategory } },
  });
}

export async function upsertVitalInfo(category: string, content: string) {
  const validCategory = categorySchema.parse(category);
  const validContent = contentSchema.parse(content);
  const { circleId } = await requireCircleContext();

  const result = await prisma.vitalInfo.upsert({
    where: { circleId_category: { circleId, category: validCategory } },
    update: { content: validContent },
    create: { circleId, category: validCategory, content: validContent },
  });

  revalidatePath("/vital-info");
  return result;
}

export async function deleteVitalInfo(id: string) {
  const validId = idSchema.parse(id);
  const { circleId } = await requireCircleContext();
  const item = await prisma.vitalInfo.findFirst({ where: vitalInfoInCircle(validId, circleId) });
  if (!item) throw new AuthorizationError("Health info not found in your circle");
  await prisma.vitalInfo.delete({ where: { id: validId } });
  revalidatePath("/vital-info");
}
