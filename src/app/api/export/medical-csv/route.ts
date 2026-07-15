import { prisma } from "@/lib/db";
import { getMembership, getRequestSession } from "@/lib/access";
import { stringify } from "csv-stringify/sync";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await getRequestSession();
  if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 });
  const membership = await getMembership(session.user.id);
  if (!membership) return new NextResponse("Forbidden", { status: 403 });

  const medicalTasks = await prisma.task.findMany({
    where: { circleId: membership.circleId, type: "Medical" },
    include: { assignee: true, creator: true },
    orderBy: { createdAt: "desc" },
  });

  const csv = stringify(
    medicalTasks.map((task) => ({
      Title: task.title,
      Description: task.description ?? "N/A",
      Status: task.status,
      "Due Date": task.dueDate?.toISOString().split("T")[0] ?? "N/A",
      "Assigned To": task.assignee?.name ?? "Unassigned",
      "Created By": task.creator?.name ?? "N/A",
      "Created At": task.createdAt.toISOString().split("T")[0],
    })),
    { header: true },
  );

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="doctors-brief-${new Date().toISOString().split("T")[0]}.csv"`,
    },
  });
}
