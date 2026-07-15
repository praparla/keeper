import { prisma } from "@/lib/db";
import { requireCircleContext } from "@/lib/access";
import { DashboardClient } from "./dashboard-client";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { user, circleId } = await requireCircleContext();

  const [activeTasks, resolvedTasks, recipients] = await Promise.all([
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
    />
  );
}
