"use server";

import { prisma } from "@/lib/db";
import { AuthorizationError, requireCircleContext, requireRecipient, taskInCircle } from "@/lib/access";
import { revalidatePath } from "next/cache";
import { TaskType, TaskStatus, Recurrence } from "@prisma/client";
import { z } from "zod";
import { nextDueDate, isRecurring } from "@/lib/recurrence";

const TASK_TYPES = ["Note", "Medical", "Household", "Errand"] as const;
const TASK_STATUSES = ["Open", "InProgress", "Resolved"] as const;
const RECURRENCES = ["NONE", "DAYS", "WEEKLY", "MONTHLY", "YEARLY", "SEASONAL"] as const;

const recurrenceFields = {
  recurrence: z.enum(RECURRENCES).optional(),
  recurEveryDays: z.number().int().gte(1).lte(3650).nullable().optional(),
  windowStartMonth: z.number().int().gte(1).lte(12).nullable().optional(),
  windowStartDay: z.number().int().gte(1).lte(31).nullable().optional(),
  windowEndMonth: z.number().int().gte(1).lte(12).nullable().optional(),
  windowEndDay: z.number().int().gte(1).lte(31).nullable().optional(),
};

const createTaskSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(500),
  description: z.string().max(5000).optional(),
  type: z.enum(TASK_TYPES).optional().default("Note"),
  dueDate: z.string().refine((value) => !value || !Number.isNaN(Date.parse(value)), "Invalid date").optional(),
  assigneeId: z.string().min(1).optional(),
  recipientId: z.string().min(1).nullable().optional(),
  priority: z.boolean().optional(),
  ...recurrenceFields,
});

const updateTaskSchema = z.object({
  title: z.string().trim().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  type: z.enum(TASK_TYPES).optional(),
  status: z.enum(TASK_STATUSES).optional(),
  dueDate: z.string().refine((value) => !value || !Number.isNaN(Date.parse(value)), "Invalid date").nullable().optional(),
  assigneeId: z.string().min(1).nullable().optional(),
  recipientId: z.string().min(1).nullable().optional(),
  priority: z.boolean().optional(),
  ...recurrenceFields,
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

async function validateRecipient(recipientId: string | null | undefined, circleId: string) {
  if (!recipientId) return;
  await requireRecipient(recipientId, circleId);
}

export async function getTasks(status?: TaskStatus) {
  const { circleId } = await requireCircleContext();
  return prisma.task.findMany({
    where: { circleId, ...(status ? { status } : {}) },
    include: { assignee: true, creator: true, recipient: true },
    orderBy: { createdAt: "desc" },
  });
}

/** Overdue is a first-class query (§6.3): due before today and not Resolved. */
export async function getOverdueTasks(now: Date = new Date()) {
  const { circleId } = await requireCircleContext();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return prisma.task.findMany({
    where: {
      circleId,
      status: { not: TaskStatus.Resolved },
      dueDate: { lt: startOfToday },
    },
    include: { assignee: true, creator: true, recipient: true },
    orderBy: { dueDate: "asc" },
  });
}

export async function getTaskById(id: string) {
  const validId = idSchema.parse(id);
  const { circleId } = await requireCircleContext();
  return prisma.task.findFirst({
    where: taskInCircle(validId, circleId),
    include: { assignee: true, creator: true, recipient: true },
  });
}

export async function createTask(data: z.input<typeof createTaskSchema>) {
  const validated = createTaskSchema.parse(data);
  const { user, circleId } = await requireCircleContext();
  await validateAssignee(validated.assigneeId, circleId);
  await validateRecipient(validated.recipientId, circleId);

  const task = await prisma.task.create({
    data: {
      circleId,
      title: validated.title,
      description: validated.description || null,
      type: validated.type,
      dueDate: validated.dueDate ? new Date(validated.dueDate) : null,
      assigneeId: validated.assigneeId || null,
      recipientId: validated.recipientId ?? null,
      priority: validated.priority ?? false,
      recurrence: validated.recurrence ?? Recurrence.NONE,
      recurEveryDays: validated.recurEveryDays ?? null,
      windowStartMonth: validated.windowStartMonth ?? null,
      windowStartDay: validated.windowStartDay ?? null,
      windowEndMonth: validated.windowEndMonth ?? null,
      windowEndDay: validated.windowEndDay ?? null,
      creatorId: user.id,
    },
  });

  revalidatePath("/dashboard");
  return task;
}

export async function updateTask(id: string, data: z.input<typeof updateTaskSchema>) {
  const validId = idSchema.parse(id);
  const validated = updateTaskSchema.parse(data);
  const { circleId } = await requireCircleContext();
  await requireTask(validId, circleId);
  await validateAssignee(validated.assigneeId, circleId);
  await validateRecipient(validated.recipientId, circleId);

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
      recipientId: validated.recipientId === undefined ? undefined : validated.recipientId ?? null,
    },
  });

  revalidatePath("/dashboard");
  return task;
}

/** Stop a recurring task from repeating without deleting the current instance. */
export async function stopRecurrence(taskId: string) {
  const validId = idSchema.parse(taskId);
  const { circleId } = await requireCircleContext();
  await requireTask(validId, circleId);
  const task = await prisma.task.update({
    where: { id: validId },
    data: {
      recurrence: Recurrence.NONE,
      recurEveryDays: null,
      windowStartMonth: null,
      windowStartDay: null,
      windowEndMonth: null,
      windowEndDay: null,
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

/**
 * Resolve a task. For a recurring task this also materializes the next instance
 * immediately (§6.3) — copying its config with the next due date — so the cadence
 * never depends on a background job. Returns the resolved task plus any spawned one.
 */
export async function resolveTask(taskId: string, now: Date = new Date()) {
  const validId = idSchema.parse(taskId);
  const { circleId } = await requireCircleContext();
  const existing = await requireTask(validId, circleId);

  const resolved = await prisma.task.update({
    where: { id: validId },
    data: { status: TaskStatus.Resolved },
  });

  // Resolving a refill-generated task (medicationId set) is a fill event — advance the
  // med's cycle, or the next sweep would see isRefillDue() still true and spawn a
  // duplicate refill task. (Mark-filled from the med row does this too.)
  if (existing.medicationId) {
    await prisma.medication.update({
      where: { id: existing.medicationId },
      data: { lastFilledAt: now },
    });
    revalidatePath("/parents");
  }

  let spawned = null;
  if (isRecurring(existing)) {
    const from = existing.dueDate ?? now;
    const due = nextDueDate(existing, from, now);
    if (due) {
      spawned = await prisma.task.create({
        data: {
          circleId: existing.circleId,
          recipientId: existing.recipientId,
          title: existing.title,
          description: existing.description,
          type: existing.type,
          status: TaskStatus.Open,
          priority: existing.priority,
          dueDate: due,
          assigneeId: existing.assigneeId,
          creatorId: existing.creatorId,
          recurrence: existing.recurrence,
          recurEveryDays: existing.recurEveryDays,
          windowStartMonth: existing.windowStartMonth,
          windowStartDay: existing.windowStartDay,
          windowEndMonth: existing.windowEndMonth,
          windowEndDay: existing.windowEndDay,
          templateSlug: existing.templateSlug,
        },
      });
    }
  }

  revalidatePath("/dashboard");
  return { resolved, spawned };
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
