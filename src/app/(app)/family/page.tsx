import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireCircleContext } from "@/lib/access";
import { MemberAvatar } from "@/components/member-avatar";
import { Badge } from "@/components/ui/badge";
import { Settings, ChevronRight } from "lucide-react";
import { FamilyInvite } from "./family-client";

export const dynamic = "force-dynamic";

export default async function FamilyPage() {
  const { membership, circleId } = await requireCircleContext();
  const memberships = await prisma.membership.findMany({
    where: { circleId },
    include: { user: true },
    orderBy: { joinedAt: "asc" },
  });

  const canInvite = membership.role !== "VIEWER";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl">{membership.circle.name}</h1>
        <p className="text-sm text-muted-foreground">{memberships.length} member{memberships.length === 1 ? "" : "s"}</p>
      </div>

      <section className="space-y-2">
        <h2 className="text-sm font-medium">Members</h2>
        <div className="notebook-list rounded-lg border">
          {memberships.map((m) => (
            <div key={m.id} className="flex items-center gap-3 p-3">
              <MemberAvatar name={m.user.name} color={m.user.color} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="font-medium">{m.user.name ?? m.user.email ?? "Member"}</p>
                <p className="truncate text-xs text-muted-foreground">{m.user.email}</p>
              </div>
              <Badge variant="note">{m.role.toLowerCase()}</Badge>
            </div>
          ))}
        </div>
      </section>

      {canInvite && <FamilyInvite />}

      <section className="space-y-2">
        <h2 className="text-sm font-medium">Settings</h2>
        <Link
          href="/settings"
          className="flex items-center gap-3 rounded-lg border p-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Settings className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
          <span className="flex-1 font-medium">Notifications & account</span>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </Link>
      </section>
    </div>
  );
}
