import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireCircleContext: vi.fn(),
  suggestionFindFirst: vi.fn(),
  suggestionUpdate: vi.fn(),
  suppressionUpsert: vi.fn(),
  factUpsert: vi.fn(),
  taskCreate: vi.fn(),
  transaction: vi.fn(),
  revalidatePath: vi.fn(),
  sweepCircle: vi.fn(),
}));

vi.mock("@/lib/access", () => ({
  AuthorizationError: class AuthorizationError extends Error {},
  requireCircleContext: mocks.requireCircleContext,
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    suggestion: { findFirst: mocks.suggestionFindFirst, update: mocks.suggestionUpdate },
    suggestionSuppression: { upsert: mocks.suppressionUpsert },
    profileFact: { upsert: mocks.factUpsert },
    task: { create: mocks.taskCreate },
    membership: { findUnique: vi.fn() },
    $transaction: mocks.transaction,
  },
}));

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/lib/jobs/sweep", () => ({ sweepCircle: mocks.sweepCircle }));

import { acceptSuggestion, dismissSuggestion } from "@/lib/actions/suggestion";

describe("suggestion actions", () => {
  beforeEach(() => {
    mocks.requireCircleContext.mockResolvedValue({ user: { id: "user-a" }, circleId: "circle-a" });
    mocks.transaction.mockResolvedValue([{ id: "task-1" }, {}]);
    mocks.suggestionUpdate.mockResolvedValue({});
    mocks.suppressionUpsert.mockResolvedValue({});
    mocks.factUpsert.mockResolvedValue({});
  });

  it("rejects accepting a suggestion from another circle", async () => {
    mocks.suggestionFindFirst.mockResolvedValue(null);
    await expect(acceptSuggestion("s-x")).rejects.toThrow("Suggestion not found in your circle");
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("accept creates a task carrying suggestion + template provenance", async () => {
    mocks.suggestionFindFirst.mockResolvedValue({
      id: "s1", circleId: "circle-a", recipientId: "r1", status: "PENDING",
      title: "Furnace tune-up", reason: "It's the season.", windowStart: new Date("2026-09-15"),
      template: { slug: "furnace-tuneup-fall", defaultTaskType: "Household", defaultRecurrence: "YEARLY", intervalDays: null },
    });
    await acceptSuggestion("s1");
    expect(mocks.taskCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        circleId: "circle-a", recipientId: "r1", suggestionId: "s1",
        templateSlug: "furnace-tuneup-fall", recurrence: "YEARLY",
      }),
    });
  });

  it("dismiss NOT_NOW only expires the cycle (no suppression, no fact write)", async () => {
    mocks.suggestionFindFirst.mockResolvedValue({ id: "s1", circleId: "circle-a", recipientId: "r1", template: { slug: "furnace-tuneup-fall" } });
    await dismissSuggestion("s1", "NOT_NOW");
    expect(mocks.suggestionUpdate).toHaveBeenCalledWith({ where: { id: "s1" }, data: { status: "EXPIRED" } });
    expect(mocks.suppressionUpsert).not.toHaveBeenCalled();
    expect(mocks.factUpsert).not.toHaveBeenCalled();
  });

  it("dismiss NOT_APPLICABLE suppresses and flips the gating fact", async () => {
    mocks.suggestionFindFirst.mockResolvedValue({
      id: "s1", circleId: "circle-a", recipientId: "r1",
      template: { slug: "gutter-clean-fall", requiresFacts: { facts: { hasGutters: true } } },
    });
    await dismissSuggestion("s1", "NOT_APPLICABLE");
    expect(mocks.suppressionUpsert).toHaveBeenCalled();
    // Required true → stored false so the gate no longer qualifies.
    expect(mocks.factUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ recipientId: "r1", key: "hasGutters", value: "false", source: "DISMISSAL" }),
      }),
    );
  });

  it("dismiss SELF_HANDLED suppresses without touching facts", async () => {
    mocks.suggestionFindFirst.mockResolvedValue({
      id: "s1", circleId: "circle-a", recipientId: "r1",
      template: { slug: "gutter-clean-fall", requiresFacts: { facts: { hasGutters: true } } },
    });
    await dismissSuggestion("s1", "SELF_HANDLED");
    expect(mocks.suppressionUpsert).toHaveBeenCalled();
    expect(mocks.factUpsert).not.toHaveBeenCalled();
  });
});
