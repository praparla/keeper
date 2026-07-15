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

export async function getRequestSession() {
  return auth.api.getSession({ headers: await headers() });
}

export async function requireUser() {
  const session = await getRequestSession();
  if (!session?.user?.id) throw new AuthenticationError();
  return session.user;
}

export async function getMembership(userId: string) {
  return prisma.membership.findFirst({
    where: { userId },
    include: { circle: true },
    orderBy: { joinedAt: "asc" },
  });
}

export async function requireCircleContext() {
  const user = await requireUser();
  const membership = await getMembership(user.id);
  if (!membership) throw new AuthorizationError();
  return { user, membership, circleId: membership.circleId };
}

export function taskInCircle(id: string, circleId: string) {
  return { id, circleId };
}

export function vitalInfoInCircle(id: string, circleId: string) {
  return { id, circleId };
}
