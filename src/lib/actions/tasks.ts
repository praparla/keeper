"use server";

import { prisma } from "@/lib/db";
import { AuthorizationError, requireCircleContext, taskInCircle } from "@/lib/access";
import { revalidatePath } from "next/cache";
import { TaskType, TaskStatus } from "@prisma/client";
import { z } from "zod";

const TASK_TYPES = ["Note", "Medical", "Household", "Errand"] as const;
const TASK_STATUSES = ["Open", "InProgress", "Resolved"] as const;

const createTaskSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(500),
  description: z.string().max(5000).optional(),
  type: z.enum(TASK_TYPES).optional().default("Note"),
  dueDate: z.string().refine((value) => !value || !Number.isNaN(Date.parse(value)), "Invalid date").optional(),
  assigneeId: z.string().min(1).optional(),
});

const updateTaskSchema = z.object({
  title: z.string().trim().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  type: z.enum(TASK_TYPES).optional(),
  status: z.enum(TASK_STATUSES).optional(),
  dueDate: z.string().refine((value) => !value || !Number.isNaN(Date.parse(value)), "Invalid date").nullable().optional(),
  assigneeId: z.string().min(1).nullable().optional(),
});

const idSchema = z.string().min(1, "ID is required");

async function requireTask(id: string, circleId: string) {
  const task = await prisma.task.findFirst({ where: taskInCircle(id, circleId) });
  if (!task) throw new AuthorizationError("Task not found in your circle");
  return task;
}

async function validateAssignee(assigneeId: string | null | undefined, circleId: string) {
  if (!assigneeId) return;
  const membership = await prisma.membership.findUnique({
    where: { userId_circleId: { userId: assigneeId, circleId } },
    select: { id: true },
  });
  if (!membership) throw new AuthorizationError("Assignee is not in your circle");
}

export async function getTasks(status?: TaskStatus) {
  const { circleId } = await requireCircleContext();
  return prisma.task.findMany({
    where: { circleId, ...(status ? { status } : {}) },
    include: { assignee: true, creator: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function getTaskById(id: string) {
  const validId = idSchema.parse(id);
  const { circleId } = await requireCircleContext();
  return prisma.task.findFirst({
    where: taskInCircle(validId, circleId),
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
  const { user, circleId } = await requireCircleContext();
  await validateAssignee(validated.assigneeId, circleId);

  const task = await prisma.task.create({
    data: {
      circleId,
      title: validated.title,
      description: validated.description || null,
      type: validated.type,
      dueDate: validated.dueDate ? new Date(validated.dueDate) : null,
      assigneeId: validated.assigneeId || null,
      creatorId: user.id,
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
  },
) {
  const validId = idSchema.parse(id);
  const validated = updateTaskSchema.parse(data);
  const { circleId } = await requireCircleContext();
  await requireTask(validId, circleId);
  await validateAssignee(validated.assigneeId, circleId);

  const task = await prisma.task.update({
    where: { id: validId },
    data: {
      ...validated,
      dueDate:
        validated.dueDate === undefined
          ? undefined
          : validated.dueDate
            ? new Date(validated.dueDate)
            : null,
    },
  });

  revalidatePath("/dashboard");
  return task;
}

export async function deleteTask(id: string) {
  const validId = idSchema.parse(id);
  const { circleId } = await requireCircleContext();
  await requireTask(validId, circleId);
  await prisma.task.delete({ where: { id: validId } });
  revalidatePath("/dashboard");
}

export async function assignTaskToMe(taskId: string) {
  const validId = idSchema.parse(taskId);
  const { user, circleId } = await requireCircleContext();
  await requireTask(validId, circleId);
  const task = await prisma.task.update({
    where: { id: validId },
    data: { assigneeId: user.id, status: "InProgress" },
    include: { assignee: true },
  });
  revalidatePath("/dashboard");
  return task;
}

export async function resolveTask(taskId: string) {
  const validId = idSchema.parse(taskId);
  const { circleId } = await requireCircleContext();
  await requireTask(validId, circleId);
  const task = await prisma.task.update({
    where: { id: validId },
    data: { status: "Resolved" },
  });
  revalidatePath("/dashboard");
  return task;
}

export async function getUsers() {
  const { circleId } = await requireCircleContext();
  const memberships = await prisma.membership.findMany({
    where: { circleId },
    include: { user: true },
    orderBy: { user: { name: "asc" } },
  });
  return memberships.map(({ user }) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    image: user.image,
    color: user.color,
  }));
}
