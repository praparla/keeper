import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireCircleContext: vi.fn(),
  requireRecipient: vi.fn(),
  recipientCreate: vi.fn(),
  recipientFindFirst: vi.fn(),
  factCreateMany: vi.fn(),
  factUpsert: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/access", () => ({
  AuthorizationError: class AuthorizationError extends Error {},
  requireCircleContext: mocks.requireCircleContext,
  requireRecipient: mocks.requireRecipient,
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    careRecipient: { create: mocks.recipientCreate, findFirst: mocks.recipientFindFirst },
    profileFact: { createMany: mocks.factCreateMany, upsert: mocks.factUpsert },
  },
}));

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));

import { createRecipient, setFact } from "@/lib/actions/recipient";

describe("recipient actions", () => {
  beforeEach(() => {
    mocks.requireCircleContext.mockResolvedValue({ user: { id: "user-a" }, circleId: "circle-a" });
    mocks.requireRecipient.mockResolvedValue({ id: "rec-a", circleId: "circle-a" });
  });

  it("rejects unauthenticated creation before touching Prisma", async () => {
    mocks.requireCircleContext.mockRejectedValue(new Error("Authentication required"));
    await expect(createRecipient({ name: "Mom" })).rejects.toThrow("Authentication required");
    expect(mocks.recipientCreate).not.toHaveBeenCalled();
  });

  it("writes the acting circle and seeds default facts", async () => {
    mocks.recipientCreate.mockResolvedValue({ id: "rec-a", residenceType: "APARTMENT" });
    await createRecipient({ name: "Mom", residenceType: "APARTMENT" });
    expect(mocks.recipientCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ circleId: "circle-a", name: "Mom", residenceType: "APARTMENT" }),
    });
    // Facts are seeded for the new recipient.
    expect(mocks.factCreateMany).toHaveBeenCalledOnce();
    const seeded = mocks.factCreateMany.mock.calls[0][0].data;
    expect(seeded.some((f: { key: string }) => f.key === "hasLawn")).toBe(true);
  });

  it("rejects an unknown fact key", async () => {
    await expect(setFact("rec-a", "hasWings", "true")).rejects.toThrow("Unknown fact key");
    expect(mocks.factUpsert).not.toHaveBeenCalled();
  });

  it("rejects an invalid fact value", async () => {
    await expect(setFact("rec-a", "hasLawn", "maybe")).rejects.toThrow("Invalid fact value");
    expect(mocks.factUpsert).not.toHaveBeenCalled();
  });

  it("enforces recipient-in-circle before writing a fact", async () => {
    mocks.requireRecipient.mockRejectedValue(new Error("Recipient not found in your circle"));
    await expect(setFact("rec-other", "hasLawn", "true")).rejects.toThrow("Recipient not found");
    expect(mocks.factUpsert).not.toHaveBeenCalled();
  });
});
