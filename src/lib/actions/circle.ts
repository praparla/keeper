"use server";

import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/db";
import { AuthorizationError, getMembership, requireCircleContext, requireUser } from "@/lib/access";
import { redirect } from "next/navigation";
import { z } from "zod";

const circleNameSchema = z.string().trim().min(1, "Family name is required").max(100);
const tokenSchema = z.string().uuid();

export async function createCircle(formData: FormData) {
  const user = await requireUser();
  const existing = await getMembership(user.id);
  if (existing) redirect("/dashboard");
  const name = circleNameSchema.parse(formData.get("name"));

  await prisma.careCircle.create({
    data: { name, members: { create: { userId: user.id, role: "OWNER" } } },
  });
  redirect("/dashboard");
}

export async function createInvite() {
  const { user, membership, circleId } = await requireCircleContext();
  if (membership.role === "VIEWER") throw new AuthorizationError("Viewers cannot invite members");
  const invite = await prisma.invite.create({
    data: {
      circleId,
      token: randomUUID(),
      role: "MEMBER",
      invitedById: user.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });
  const baseUrl = process.env.BETTER_AUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return { url: new URL(`/invite/${invite.token}`, baseUrl).toString() };
}

export async function acceptInvite(token: string) {
  const validToken = tokenSchema.parse(token);
  const user = await requireUser();
  await prisma.$transaction(async (tx) => {
    const invite = await tx.invite.findFirst({
      where: { token: validToken, acceptedAt: null, revokedAt: null, expiresAt: { gt: new Date() } },
    });
    if (!invite) throw new AuthorizationError("Invite is invalid or expired");
    const existingMembership = await tx.membership.findFirst({ where: { userId: user.id } });
    if (existingMembership && existingMembership.circleId !== invite.circleId) {
      throw new AuthorizationError("You already belong to another family circle");
    }
    await tx.membership.upsert({
      where: { userId_circleId: { userId: user.id, circleId: invite.circleId } },
      update: {},
      create: { userId: user.id, circleId: invite.circleId, role: invite.role },
    });
    const claimed = await tx.invite.updateMany({
      where: { id: invite.id, acceptedAt: null },
      data: { acceptedAt: new Date() },
    });
    if (claimed.count !== 1) throw new AuthorizationError("Invite was already used");
  });
  redirect("/dashboard");
}
