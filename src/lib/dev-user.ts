/**
 * Dev user helper for local testing with auth disabled.
 * Looks up the real user from the database by email.
 * TODO: Remove this when real auth is wired up.
 */

import { prisma } from "@/lib/db";

const DEV_EMAIL = "pranava@family.dev";

export const DEV_USER = {
  name: "Pranava",
  email: DEV_EMAIL,
};

let _cachedId: string | null = null;

export async function getDevUserId(): Promise<string> {
  if (_cachedId) return _cachedId;

  const user = await prisma.user.findFirst({
    where: { email: DEV_EMAIL },
    select: { id: true },
  });

  if (!user) {
    throw new Error(
      "Dev user not found in database. Run: npm run db:seed"
    );
  }

  _cachedId = user.id;
  return user.id;
}
