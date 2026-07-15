import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireCircleContext: vi.fn(),
  findFirst: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  membershipFindUnique: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/access", () => ({
  AuthorizationError: class AuthorizationError extends Error {},
  requireCircleContext: mocks.requireCircleContext,
  taskInCircle: (id: string, circleId: string) => ({ id, circleId }),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    task: { findFirst: mocks.findFirst, create: mocks.create, update: mocks.update },
    membership: { findUnique: mocks.membershipFindUnique },
  },
}));

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));

import { createTask, updateTask } from "@/lib/actions/tasks";

describe("task authorization", () => {
  beforeEach(() => {
    mocks.requireCircleContext.mockResolvedValue({ user: { id: "user-a" }, circleId: "circle-a" });
  });

  it("rejects unauthenticated creation before touching Prisma", async () => {
    mocks.requireCircleContext.mockRejectedValue(new Error("Authentication required"));
    await expect(createTask({ title: "Private task" })).rejects.toThrow("Authentication required");
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("writes the acting user's circle and identity", async () => {
    mocks.create.mockResolvedValue({ id: "task-a" });
    await createTask({ title: "Call pharmacy" });
    expect(mocks.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ circleId: "circle-a", creatorId: "user-a", title: "Call pharmacy" }),
    });
  });

  it("does not update a task from another circle", async () => {
    mocks.findFirst.mockResolvedValue(null);
    await expect(updateTask("task-b", { title: "Stolen" })).rejects.toThrow("Task not found in your circle");
    expect(mocks.findFirst).toHaveBeenCalledWith({ where: { id: "task-b", circleId: "circle-a" } });
    expect(mocks.update).not.toHaveBeenCalled();
  });
});
