"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

// TODO: Re-add auth checks when auth is configured

export async function getVitalInfo() {
  return prisma.vitalInfo.findMany({
    orderBy: { category: "asc" },
  });
}

export async function getVitalInfoByCategory(category: string) {
  return prisma.vitalInfo.findFirst({
    where: { category },
  });
}

export async function upsertVitalInfo(category: string, content: string) {
  const existing = await prisma.vitalInfo.findFirst({
    where: { category },
  });

  let result;
  if (existing) {
    result = await prisma.vitalInfo.update({
      where: { id: existing.id },
      data: { content },
    });
  } else {
    result = await prisma.vitalInfo.create({
      data: { category, content },
    });
  }

  revalidatePath("/vital-info");
  return result;
}

export async function deleteVitalInfo(id: string) {
  await prisma.vitalInfo.delete({ where: { id } });
  revalidatePath("/vital-info");
}
