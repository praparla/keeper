import { prisma } from "@/lib/db";
import { requireCircleContext } from "@/lib/access";
import { getPendingSuggestions } from "@/lib/actions/suggestion";
import { DashboardClient } from "./dashboard-client";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { user, circleId } = await requireCircleContext();

  const [activeTasks, resolvedTasks, recipients, suggestions, members] = await Promise.all([
    prisma.task.findMany({
      where: { circleId, status: { not: "Resolved" } },
      include: { assignee: true, creator: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.task.findMany({
      where: { circleId, status: "Resolved" },
      include: { assignee: true, creator: true },
      orderBy: { updatedAt: "desc" },
      take: 20,
    }),
    prisma.careRecipient.findMany({
      where: { circleId },
      select: { id: true, name: true, relationship: true },
      orderBy: { createdAt: "asc" },
    }),
    getPendingSuggestions(),
    prisma.membership.findMany({
      where: { circleId },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { joinedAt: "asc" },
    }),
  ]);

  const unassigned = activeTasks.filter((t) => !t.assigneeId);
  const myTasks = activeTasks.filter((task) => task.assigneeId === user.id);

  return (
    <DashboardClient
      unassigned={unassigned}
      myTasks={myTasks}
      resolved={resolvedTasks}
      userName={user.name}
      recipients={recipients.map((r) => ({ id: r.id, label: r.relationship || r.name }))}
      suggestions={suggestions.map((s) => ({
        id: s.id,
        title: s.title,
        reason: s.reason,
        recipientName: s.recipient?.relationship || s.recipient?.name || null,
        windowStart: s.windowStart.toISOString(),
        windowEnd: s.windowEnd?.toISOString() ?? null,
      }))}
      members={members.map((m) => ({ id: m.user.id, name: m.user.name }))}
    />
  );
}
