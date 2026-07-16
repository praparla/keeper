"use server";

import { prisma } from "@/lib/db";
import { AuthorizationError, requireCircleContext, requireRecipient } from "@/lib/access";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const idSchema = z.string().min(1, "ID is required");

const providerSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(160),
  specialty: z.string().trim().max(120).optional(),
  phone: z.string().trim().max(40).optional(),
  address: z.string().trim().max(400).optional(),
  notes: z.string().max(4000).optional(),
});

/** A provider is in the acting circle iff its recipient is. Throws otherwise. */
async function requireProvider(id: string, circleId: string) {
  const provider = await prisma.provider.findFirst({
    where: { id, recipient: { circleId } },
  });
  if (!provider) throw new AuthorizationError("Provider not found in your circle");
  return provider;
}

export async function getProviders(recipientId: string) {
  const validId = idSchema.parse(recipientId);
  const { circleId } = await requireCircleContext();
  await requireRecipient(validId, circleId);
  return prisma.provider.findMany({
    where: { recipientId: validId },
    orderBy: { name: "asc" },
  });
}

export async function createProvider(
  recipientId: string,
  data: { name: string; specialty?: string; phone?: string; address?: string; notes?: string },
) {
  const validRecipientId = idSchema.parse(recipientId);
  const v = providerSchema.parse(data);
  const { circleId } = await requireCircleContext();
  await requireRecipient(validRecipientId, circleId);

  const provider = await prisma.provider.create({
    data: {
      recipientId: validRecipientId,
      name: v.name,
      specialty: v.specialty || null,
      phone: v.phone || null,
      address: v.address || null,
      notes: v.notes || null,
    },
  });

  revalidatePath("/parents");
  return provider;
}

export async function updateProvider(
  id: string,
  data: { name?: string; specialty?: string; phone?: string; address?: string; notes?: string },
) {
  const validId = idSchema.parse(id);
  const v = providerSchema.partial().parse(data);
  const { circleId } = await requireCircleContext();
  await requireProvider(validId, circleId);

  const provider = await prisma.provider.update({
    where: { id: validId },
    data: {
      ...(v.name !== undefined ? { name: v.name } : {}),
      ...(v.specialty !== undefined ? { specialty: v.specialty || null } : {}),
      ...(v.phone !== undefined ? { phone: v.phone || null } : {}),
      ...(v.address !== undefined ? { address: v.address || null } : {}),
      ...(v.notes !== undefined ? { notes: v.notes || null } : {}),
    },
  });

  revalidatePath("/parents");
  return provider;
}

export async function deleteProvider(id: string) {
  const validId = idSchema.parse(id);
  const { circleId } = await requireCircleContext();
  await requireProvider(validId, circleId);
  // Meds/appointments keep history via SetNull on prescriberId/providerId.
  await prisma.provider.delete({ where: { id: validId } });
  revalidatePath("/parents");
}
