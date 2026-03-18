"use server";

import { prisma } from "@/lib/db";
import { DEV_USER } from "@/lib/dev-user";
import { revalidatePath } from "next/cache";
import { z } from "zod";

// TODO: Replace DEV_USER with real auth session

const updateProfileSchema = z.object({
  phoneNumber: z.string().max(30).optional(),
  emailReminders: z.boolean().optional(),
  smsReminders: z.boolean().optional(),
});

export async function getCurrentUser() {
  return prisma.user.findFirst({
    where: { email: DEV_USER.email },
  });
}

export async function updateProfile(data: {
  phoneNumber?: string;
  emailReminders?: boolean;
  smsReminders?: boolean;
}) {
  const validated = updateProfileSchema.parse(data);

  // Find dev user by email, since the ID may not exist in DB yet
  const existing = await prisma.user.findFirst({
    where: { email: DEV_USER.email },
  });

  if (!existing) {
    throw new Error("Dev user not found — run `npm run db:seed` first");
  }

  const user = await prisma.user.update({
    where: { id: existing.id },
    data: {
      phoneNumber: validated.phoneNumber,
      emailReminders: validated.emailReminders,
      smsReminders: validated.smsReminders,
    },
  });

  revalidatePath("/settings");
  return user;
}
