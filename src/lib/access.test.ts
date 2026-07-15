import { describe, expect, it } from "vitest";
import { taskInCircle } from "@/lib/access";

describe("circle-scoped selectors", () => {
  it("always binds a task ID to its circle", () => {
    expect(taskInCircle("task-b", "circle-a")).toEqual({ id: "task-b", circleId: "circle-a" });
  });
});
