"use server";

import { prisma } from "@/lib/db";
import { DEV_USER } from "@/lib/dev-user";
import { revalidatePath } from "next/cache";

// TODO: Replace DEV_USER with real auth session

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
      phoneNumber: data.phoneNumber,
      emailReminders: data.emailReminders,
      smsReminders: data.smsReminders,
    },
  });

  revalidatePath("/settings");
  return user;
}
