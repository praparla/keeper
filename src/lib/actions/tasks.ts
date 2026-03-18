"use server";

import { prisma } from "@/lib/db";
import { getDevUserId } from "@/lib/dev-user";
import { revalidatePath } from "next/cache";
import { TaskType, TaskStatus } from "@prisma/client";
import { z } from "zod";

// TODO: Replace DEV_USER with real auth session throughout this file

const TASK_TYPES: [string, ...string[]] = ["Note", "Medical", "Household", "Errand"];
const TASK_STATUSES: [string, ...string[]] = ["Open", "InProgress", "Resolved"];

const createTaskSchema = z.object({
  title: z.string().min(1, "Title is required").max(500),
  description: z.string().max(5000).optional(),
  type: z.enum(TASK_TYPES).optional().default("Note"),
  dueDate: z.string().refine((v) => !v || !isNaN(Date.parse(v)), "Invalid date").optional(),
  assigneeId: z.string().optional(),
});

const updateTaskSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  type: z.enum(TASK_TYPES).optional(),
  status: z.enum(TASK_STATUSES).optional(),
  dueDate: z.string().refine((v) => !v || !isNaN(Date.parse(v)), "Invalid date").nullable().optional(),
  assigneeId: z.string().nullable().optional(),
});

const idSchema = z.string().min(1, "ID is required");

export async function getTasks(status?: TaskStatus) {
  const where = status ? { status } : {};
  return prisma.task.findMany({
    where,
    include: { assignee: true, creator: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function getTaskById(id: string) {
  const validId = idSchema.parse(id);
  return prisma.task.findUnique({
    where: { id: validId },
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
  const validated = createTaskSchema.parse(data);
  const userId = await getDevUserId();

  const task = await prisma.task.create({
    data: {
      title: validated.title,
      description: validated.description || null,
      type: validated.type as TaskType,
      dueDate: validated.dueDate ? new Date(validated.dueDate) : null,
      assigneeId: validated.assigneeId || null,
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
  const validId = idSchema.parse(id);
  const validated = updateTaskSchema.parse(data);

  const updateData: Record<string, unknown> = {};
  if (validated.title !== undefined) updateData.title = validated.title;
  if (validated.description !== undefined) updateData.description = validated.description;
  if (validated.type !== undefined) updateData.type = validated.type;
  if (validated.status !== undefined) updateData.status = validated.status;
  if (validated.dueDate !== undefined)
    updateData.dueDate = validated.dueDate ? new Date(validated.dueDate) : null;
  if (validated.assigneeId !== undefined) updateData.assigneeId = validated.assigneeId;

  const task = await prisma.task.update({
    where: { id: validId },
    data: updateData,
  });

  revalidatePath("/dashboard");
  return task;
}

export async function deleteTask(id: string) {
  const validId = idSchema.parse(id);
  await prisma.task.delete({ where: { id: validId } });
  revalidatePath("/dashboard");
}

export async function assignTaskToMe(taskId: string) {
  const validId = idSchema.parse(taskId);
  const userId = await getDevUserId();

  const task = await prisma.task.update({
    where: { id: validId },
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
  const validId = idSchema.parse(taskId);
  const task = await prisma.task.update({
    where: { id: validId },
    data: { status: "Resolved" },
  });

  revalidatePath("/dashboard");
  return task;
}

export async function getUsers() {
  return prisma.user.findMany({
    select: { id: true, name: true, email: true, image: true, color: true },
    orderBy: { name: "asc" },
  });
}
