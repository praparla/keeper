import { describe, expect, it } from "vitest";
import { taskInCircle, vitalInfoInCircle } from "@/lib/access";

describe("circle-scoped selectors", () => {
  it("always binds a task ID to its circle", () => {
    expect(taskInCircle("task-b", "circle-a")).toEqual({ id: "task-b", circleId: "circle-a" });
  });

  it("always binds health info to its circle", () => {
    expect(vitalInfoInCircle("info-b", "circle-a")).toEqual({ id: "info-b", circleId: "circle-a" });
  });
});
