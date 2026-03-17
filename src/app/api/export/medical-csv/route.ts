import { prisma } from "@/lib/db";
import { stringify } from "csv-stringify/sync";
import { NextResponse } from "next/server";

// TODO: Re-add auth check when auth is configured
export async function GET() {
  const medicalTasks = await prisma.task.findMany({
    where: { type: "Medical" },
    include: { assignee: true, creator: true },
    orderBy: { createdAt: "desc" },
  });

  const csvData = medicalTasks.map((task) => ({
    Title: task.title,
    Description: task.description ?? "N/A",
    Status: task.status,
    "Due Date": task.dueDate
      ? task.dueDate.toISOString().split("T")[0]
      : "N/A",
    "Assigned To": task.assignee?.name ?? "Unassigned",
    "Created By": task.creator?.name ?? "N/A",
    "Created At": task.createdAt.toISOString().split("T")[0],
  }));

  const csv = stringify(csvData, { header: true });

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="doctors-brief-${new Date().toISOString().split("T")[0]}.csv"`,
    },
  });
}
