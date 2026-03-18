"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { z } from "zod";

// TODO: Re-add auth checks when auth is configured

const categorySchema = z.string().min(1, "Category is required").max(200);
const contentSchema = z.string().max(10000);
const idSchema = z.string().min(1, "ID is required");

export async function getVitalInfo() {
  return prisma.vitalInfo.findMany({
    orderBy: { category: "asc" },
  });
}

export async function getVitalInfoByCategory(category: string) {
  const validCategory = categorySchema.parse(category);
  return prisma.vitalInfo.findFirst({
    where: { category: validCategory },
  });
}

export async function upsertVitalInfo(category: string, content: string) {
  const validCategory = categorySchema.parse(category);
  const validContent = contentSchema.parse(content);

  const existing = await prisma.vitalInfo.findFirst({
    where: { category: validCategory },
  });

  let result;
  if (existing) {
    result = await prisma.vitalInfo.update({
      where: { id: existing.id },
      data: { content: validContent },
    });
  } else {
    result = await prisma.vitalInfo.create({
      data: { category: validCategory, content: validContent },
    });
  }

  revalidatePath("/vital-info");
  return result;
}

export async function deleteVitalInfo(id: string) {
  const validId = idSchema.parse(id);
  await prisma.vitalInfo.delete({ where: { id: validId } });
  revalidatePath("/vital-info");
}
