import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireCircleContext: vi.fn(),
  findFirst: vi.fn(),
  update: vi.fn(),
  create: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/access", () => ({
  AuthorizationError: class AuthorizationError extends Error {},
  requireCircleContext: mocks.requireCircleContext,
  requireRecipient: vi.fn(),
  taskInCircle: (id: string, circleId: string) => ({ id, circleId }),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    task: { findFirst: mocks.findFirst, update: mocks.update, create: mocks.create },
    membership: { findUnique: vi.fn() },
  },
}));

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));

import { resolveTask } from "@/lib/actions/tasks";

describe("resolveTask recurrence materialization", () => {
  beforeEach(() => {
    mocks.requireCircleContext.mockResolvedValue({ user: { id: "user-a" }, circleId: "circle-a" });
    mocks.update.mockResolvedValue({ id: "task-a", status: "Resolved" });
    mocks.create.mockResolvedValue({ id: "task-next" });
  });

  it("does not spawn a next instance for a non-recurring task", async () => {
    mocks.findFirst.mockResolvedValue({ id: "task-a", circleId: "circle-a", recurrence: "NONE", dueDate: new Date("2026-03-01") });
    const { spawned } = await resolveTask("task-a");
    expect(spawned).toBeNull();
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("materializes the next instance for a WEEKLY task with the next due date", async () => {
    mocks.findFirst.mockResolvedValue({
      id: "task-a",
      circleId: "circle-a",
      recipientId: "rec-a",
      title: "Change furnace filter",
      description: null,
      type: "Household",
      priority: true,
      assigneeId: "user-a",
      creatorId: "user-a",
      recurrence: "WEEKLY",
      recurEveryDays: null,
      windowStartMonth: null,
      windowStartDay: null,
      windowEndMonth: null,
      windowEndDay: null,
      templateSlug: null,
      dueDate: new Date("2026-03-10T09:00:00"),
    });

    const { spawned } = await resolveTask("task-a", new Date("2026-03-11T00:00:00"));
    expect(spawned).toEqual({ id: "task-next" });
    expect(mocks.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        circleId: "circle-a",
        recipientId: "rec-a",
        title: "Change furnace filter",
        status: "Open",
        recurrence: "WEEKLY",
        priority: true,
        dueDate: new Date("2026-03-17T09:00:00"),
      }),
    });
  });

  it("rejects resolving a task outside the acting circle", async () => {
    mocks.findFirst.mockResolvedValue(null);
    await expect(resolveTask("task-x")).rejects.toThrow("Task not found in your circle");
    expect(mocks.update).not.toHaveBeenCalled();
  });
});
