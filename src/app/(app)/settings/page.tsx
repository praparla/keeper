import { prisma } from "@/lib/db";
import { requireCircleContext } from "@/lib/access";
import { SettingsClient } from "./settings-client";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const { user, membership } = await requireCircleContext();
  const settings = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });

  return (
    <SettingsClient
      circleName={membership.circle.name}
      user={{
        name: settings.name ?? "Family member",
        email: settings.email ?? "",
        timezone: settings.timezone,
        digestEmail: settings.digestEmail,
        immediateEmail: settings.immediateEmail,
        weeklyEmail: settings.weeklyEmail,
      }}
    />
  );
}
