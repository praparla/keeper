import { cache } from "react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { headers } from "next/headers";

export class AuthenticationError extends Error {
  constructor() {
    super("Authentication required");
    this.name = "AuthenticationError";
  }
}

export class AuthorizationError extends Error {
  constructor(message = "Circle access required") {
    super(message);
    this.name = "AuthorizationError";
  }
}

export const getRequestSession = cache(async () => {
  return auth.api.getSession({ headers: await headers() });
});

export async function requireUser() {
  const session = await getRequestSession();
  if (!session?.user?.id) throw new AuthenticationError();
  return session.user;
}

export const getMembership = cache(async (userId: string) => {
  return prisma.membership.findFirst({
    where: { userId },
    include: { circle: true },
    orderBy: { joinedAt: "asc" },
  });
});

export async function requireCircleContext() {
  const user = await requireUser();
  const membership = await getMembership(user.id);
  if (!membership) throw new AuthorizationError();
  return { user, membership, circleId: membership.circleId };
}

export function taskInCircle(id: string, circleId: string) {
  return { id, circleId };
}

/**
 * Verify a recipient belongs to the acting user's circle. Returns the recipient
 * or throws — the single gate every recipient-scoped action funnels through so a
 * client-supplied recipientId can never reach another circle's data.
 */
export async function requireRecipient(recipientId: string, circleId: string) {
  const recipient = await prisma.careRecipient.findFirst({
    where: { id: recipientId, circleId },
  });
  if (!recipient) throw new AuthorizationError("Recipient not found in your circle");
  return recipient;
}
