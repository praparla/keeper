"use server";

import { prisma } from "@/lib/db";
import { getDevUserId } from "@/lib/dev-user";
import { revalidatePath } from "next/cache";
import { TaskType, TaskStatus } from "@prisma/client";

// TODO: Replace DEV_USER with real auth session throughout this file

export async function getTasks(status?: TaskStatus) {
  const where = status ? { status } : {};
  return prisma.task.findMany({
    where,
    include: { assignee: true, creator: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function getTaskById(id: string) {
  return prisma.task.findUnique({
    where: { id },
    include: { assignee: true, creator: true },
  });
}

export async function createTask(data: {
  title: string;
  description?: string;
  type?: TaskType;
  dueDate?: string;
  assigneeId?: string;
}) {
  const userId = await getDevUserId();

  const task = await prisma.task.create({
    data: {
      title: data.title,
      description: data.description || null,
      type: data.type || "Note",
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      assigneeId: data.assigneeId || null,
      creatorId: userId,
    },
  });

  revalidatePath("/dashboard");
  return task;
}

export async function updateTask(
  id: string,
  data: {
    title?: string;
    description?: string;
    type?: TaskType;
    status?: TaskStatus;
    dueDate?: string | null;
    assigneeId?: string | null;
  }
) {
  const updateData: Record<string, unknown> = {};
  if (data.title !== undefined) updateData.title = data.title;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.type !== undefined) updateData.type = data.type;
  if (data.status !== undefined) updateData.status = data.status;
  if (data.dueDate !== undefined)
    updateData.dueDate = data.dueDate ? new Date(data.dueDate) : null;
  if (data.assigneeId !== undefined) updateData.assigneeId = data.assigneeId;

  const task = await prisma.task.update({
    where: { id },
    data: updateData,
  });

  revalidatePath("/dashboard");
  return task;
}

export async function deleteTask(id: string) {
  await prisma.task.delete({ where: { id } });
  revalidatePath("/dashboard");
}

export async function assignTaskToMe(taskId: string) {
  const userId = await getDevUserId();

  const task = await prisma.task.update({
    where: { id: taskId },
    data: {
      assigneeId: userId,
      status: "InProgress",
    },
    include: { assignee: true },
  });

  revalidatePath("/dashboard");
  return task;
}

export async function resolveTask(taskId: string) {
  const task = await prisma.task.update({
    where: { id: taskId },
    data: { status: "Resolved" },
  });

  revalidatePath("/dashboard");
  return task;
}

export async function getUsers() {
  return prisma.user.findMany({
    select: { id: true, name: true, email: true, image: true },
    orderBy: { name: "asc" },
  });
}
