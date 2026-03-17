import { prisma } from "@/lib/db";
import { DEV_USER } from "@/lib/dev-user";
import { SettingsClient } from "./settings-client";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  // TODO: Get user from auth session
  const user = await prisma.user.findFirst({
    where: { email: DEV_USER.email },
  });

  return (
    <SettingsClient
      user={{
        id: user?.id ?? DEV_USER.id,
        name: user?.name ?? DEV_USER.name,
        email: user?.email ?? DEV_USER.email,
        phoneNumber: user?.phoneNumber ?? "",
        emailReminders: user?.emailReminders ?? true,
        smsReminders: user?.smsReminders ?? true,
      }}
    />
  );
}
