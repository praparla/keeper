import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireCircleContext: vi.fn(),
  requireRecipient: vi.fn(),
  medFindFirst: vi.fn(),
  medUpdate: vi.fn(),
  taskUpdateMany: vi.fn(),
  transaction: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/access", () => ({
  AuthorizationError: class AuthorizationError extends Error {},
  requireCircleContext: mocks.requireCircleContext,
  requireRecipient: mocks.requireRecipient,
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    medication: { findFirst: mocks.medFindFirst, update: mocks.medUpdate },
    task: { updateMany: mocks.taskUpdateMany },
    $transaction: mocks.transaction,
  },
}));

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));

import { markMedicationFilled } from "@/lib/actions/medication";

describe("markMedicationFilled", () => {
  beforeEach(() => {
    mocks.requireCircleContext.mockResolvedValue({ user: { id: "user-a" }, circleId: "circle-a" });
    // Prisma builds each op lazily; our stubs return sentinels the transaction resolves.
    mocks.medUpdate.mockReturnValue("med-op");
    mocks.taskUpdateMany.mockReturnValue("task-op");
    mocks.transaction.mockResolvedValue([{ id: "med-a", lastFilledAt: new Date() }, { count: 1 }]);
  });

  it("rejects a med from another circle before writing", async () => {
    mocks.medFindFirst.mockResolvedValue(null);
    await expect(markMedicationFilled("med-b")).rejects.toThrow("Medication not found in your circle");
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("resets the cycle and resolves the open refill task in one transaction", async () => {
    mocks.medFindFirst.mockResolvedValue({ id: "med-a", recipientId: "rec-a" });
    const result = await markMedicationFilled("med-a");

    // lastFilledAt is set to a real date on the med.
    expect(mocks.medUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "med-a" }, data: expect.objectContaining({ lastFilledAt: expect.any(Date) }) }),
    );
    // Open (non-Resolved) tasks for the med are resolved.
    expect(mocks.taskUpdateMany).toHaveBeenCalledWith({
      where: { medicationId: "med-a", status: { not: "Resolved" } },
      data: { status: "Resolved" },
    });
    // Both ops run atomically.
    expect(mocks.transaction).toHaveBeenCalledWith(["med-op", "task-op"]);
    expect(result).toEqual(expect.objectContaining({ id: "med-a" }));
  });

  it("rejects an invalid filled date", async () => {
    mocks.medFindFirst.mockResolvedValue({ id: "med-a", recipientId: "rec-a" });
    await expect(markMedicationFilled("med-a", "not-a-date")).rejects.toThrow("Invalid date");
  });
});
