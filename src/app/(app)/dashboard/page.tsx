import { prisma } from "@/lib/db";
import { DEV_USER, getDevUserId } from "@/lib/dev-user";
import { DashboardClient } from "./dashboard-client";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  // TODO: Get userId from auth session
  const userId = await getDevUserId();

  const [activeTasks, resolvedTasks] = await Promise.all([
    prisma.task.findMany({
      where: { status: { not: "Resolved" } },
      include: { assignee: true, creator: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.task.findMany({
      where: { status: "Resolved" },
      include: { assignee: true, creator: true },
      orderBy: { updatedAt: "desc" },
      take: 20,
    }),
  ]);

  const unassigned = activeTasks.filter((t) => !t.assigneeId);
  const myTasks = activeTasks.filter((t) => t.assigneeId === userId);

  return (
    <DashboardClient
      unassigned={unassigned}
      myTasks={myTasks}
      resolved={resolvedTasks}
      userName={DEV_USER.name}
    />
  );
}
