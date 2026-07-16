import { prisma } from "@/lib/db";
import { AuthenticationError, AuthorizationError, requireCircleContext } from "@/lib/access";
import { stringify } from "csv-stringify/sync";
import { NextResponse } from "next/server";

export async function GET() {
  let circleId: string;
  try {
    ({ circleId } = await requireCircleContext());
  } catch (error) {
    if (error instanceof AuthenticationError) return new NextResponse("Unauthorized", { status: 401 });
    if (error instanceof AuthorizationError) return new NextResponse("Forbidden", { status: 403 });
    throw error;
  }

  const [medicalTasks, vitalInfo] = await Promise.all([
    prisma.task.findMany({
      where: { circleId, type: "Medical" },
      include: { assignee: true, creator: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.vitalInfo.findMany({
      where: { recipient: { circleId } },
      include: { recipient: { select: { name: true } } },
      orderBy: [{ recipient: { name: "asc" } }, { category: "asc" }],
    }),
  ]);

  const healthInfoCsv = stringify(
    vitalInfo.map((info) => ({
      Recipient: info.recipient.name,
      Category: info.category,
      Details: info.content,
      "Last Updated": info.updatedAt.toISOString().split("T")[0],
    })),
    { header: true },
  );

  const medicalTasksCsv = stringify(
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

  const csv = `Health Info\n${healthInfoCsv}\nMedical Tasks\n${medicalTasksCsv}`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="doctors-brief-${new Date().toISOString().split("T")[0]}.csv"`,
    },
  });
}
