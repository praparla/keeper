import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  requireCircleContext: vi.fn(),
  getMembership: vi.fn(),
  careCircleCreate: vi.fn(),
  inviteCreate: vi.fn(),
  transaction: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock("@/lib/access", () => ({
  AuthorizationError: class AuthorizationError extends Error {},
  requireUser: mocks.requireUser,
  requireCircleContext: mocks.requireCircleContext,
  getMembership: mocks.getMembership,
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    careCircle: { create: mocks.careCircleCreate },
    invite: { create: mocks.inviteCreate },
    $transaction: mocks.transaction,
  },
}));

vi.mock("next/navigation", () => ({
  redirect: mocks.redirect.mockImplementation((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  }),
}));

import { AuthorizationError } from "@/lib/access";
import { acceptInvite, createCircle, createInvite } from "@/lib/actions/circle";

function formData(fields: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.append(key, value);
  return data;
}

describe("createCircle", () => {
  beforeEach(() => {
    mocks.requireUser.mockResolvedValue({ id: "user-a" });
    mocks.getMembership.mockResolvedValue(null);
  });

  it("creates a circle with the caller as owner and redirects to add a parent", async () => {
    mocks.careCircleCreate.mockResolvedValue({ id: "circle-a" });
    await expect(createCircle(formData({ name: "The Smiths" }))).rejects.toThrow("REDIRECT:/parents");
    expect(mocks.careCircleCreate).toHaveBeenCalledWith({
      data: { name: "The Smiths", members: { create: { userId: "user-a", role: "OWNER" } } },
    });
  });

  it("redirects without creating a circle when the user already has a membership", async () => {
    mocks.getMembership.mockResolvedValue({ id: "membership-a", circleId: "circle-a" });
    await expect(createCircle(formData({ name: "The Smiths" }))).rejects.toThrow("REDIRECT:/dashboard");
    expect(mocks.careCircleCreate).not.toHaveBeenCalled();
  });

  it("swallows a concurrent-create race instead of throwing", async () => {
    mocks.careCircleCreate.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
        code: "P2002",
        clientVersion: "test",
      })
    );
    await expect(createCircle(formData({ name: "The Smiths" }))).rejects.toThrow("REDIRECT:/parents");
  });

  it("propagates a non-conflict database error", async () => {
    mocks.careCircleCreate.mockRejectedValue(new Error("connection lost"));
    await expect(createCircle(formData({ name: "The Smiths" }))).rejects.toThrow("connection lost");
  });
});

describe("createInvite", () => {
  it("blocks viewers from creating invites", async () => {
    mocks.requireCircleContext.mockResolvedValue({
      user: { id: "user-a" },
      membership: { role: "VIEWER" },
      circleId: "circle-a",
    });
    await expect(createInvite()).rejects.toThrow(AuthorizationError);
    expect(mocks.inviteCreate).not.toHaveBeenCalled();
  });

  it("creates an invite for an owner", async () => {
    mocks.requireCircleContext.mockResolvedValue({
      user: { id: "user-a" },
      membership: { role: "OWNER" },
      circleId: "circle-a",
    });
    mocks.inviteCreate.mockResolvedValue({ token: "a-token" });
    const result = await createInvite();
    expect(result.url).toContain("/invite/a-token");
  });
});

describe("acceptInvite", () => {
  it("rejects an invalid or expired token", async () => {
    mocks.requireUser.mockResolvedValue({ id: "user-a" });
    mocks.transaction.mockImplementation(async (fn) =>
      fn({
        invite: { findFirst: vi.fn().mockResolvedValue(null) },
        membership: { findFirst: vi.fn(), upsert: vi.fn() },
      })
    );
    await expect(acceptInvite("00000000-0000-0000-0000-000000000000")).rejects.toThrow(
      "Invite is invalid or expired"
    );
  });

  it("rejects a user who already belongs to a different circle", async () => {
    mocks.requireUser.mockResolvedValue({ id: "user-a" });
    mocks.transaction.mockImplementation(async (fn) =>
      fn({
        invite: {
          findFirst: vi.fn().mockResolvedValue({ id: "invite-a", circleId: "circle-b" }),
        },
        membership: {
          findFirst: vi.fn().mockResolvedValue({ userId: "user-a", circleId: "circle-a" }),
          upsert: vi.fn(),
        },
      })
    );
    await expect(acceptInvite("00000000-0000-0000-0000-000000000000")).rejects.toThrow(
      "You already belong to another family circle"
    );
  });

  it("rejects a token claimed by a concurrent accept", async () => {
    mocks.requireUser.mockResolvedValue({ id: "user-a" });
    mocks.transaction.mockImplementation(async (fn) =>
      fn({
        invite: {
          findFirst: vi.fn().mockResolvedValue({ id: "invite-a", circleId: "circle-b", role: "MEMBER" }),
          updateMany: vi.fn().mockResolvedValue({ count: 0 }),
        },
        membership: { findFirst: vi.fn().mockResolvedValue(null), upsert: vi.fn() },
      })
    );
    await expect(acceptInvite("00000000-0000-0000-0000-000000000000")).rejects.toThrow(
      "Invite was already used"
    );
  });

  it("joins the circle and redirects on a valid, unclaimed invite", async () => {
    mocks.requireUser.mockResolvedValue({ id: "user-a" });
    const upsert = vi.fn().mockResolvedValue({});
    mocks.transaction.mockImplementation(async (fn) =>
      fn({
        invite: {
          findFirst: vi.fn().mockResolvedValue({ id: "invite-a", circleId: "circle-b", role: "MEMBER" }),
          updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        },
        membership: { findFirst: vi.fn().mockResolvedValue(null), upsert },
      })
    );
    await expect(acceptInvite("00000000-0000-0000-0000-000000000000")).rejects.toThrow("REDIRECT:/dashboard");
    expect(upsert).toHaveBeenCalledWith({
      where: { userId_circleId: { userId: "user-a", circleId: "circle-b" } },
      update: {},
      create: { userId: "user-a", circleId: "circle-b", role: "MEMBER" },
    });
  });
});
