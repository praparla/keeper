"use server";

import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/access";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const updateProfileSchema = z.object({
  digestEmail: z.boolean().optional(),
  immediateEmail: z.boolean().optional(),
  weeklyEmail: z.boolean().optional(),
  timezone: z.string().min(1).max(100).optional(),
});

export async function getCurrentUser() {
  const user = await requireUser();
  return prisma.user.findUnique({ where: { id: user.id } });
}

export async function updateProfile(data: {
  digestEmail?: boolean;
  immediateEmail?: boolean;
  weeklyEmail?: boolean;
  timezone?: string;
}) {
  const validated = updateProfileSchema.parse(data);
  const user = await requireUser();
  const updated = await prisma.user.update({ where: { id: user.id }, data: validated });
  revalidatePath("/settings");
  return updated;
}
