import { describe, expect, test } from "bun:test";
import { cn } from "@/lib/cn";

describe("cn", () => {
  test("joins truthy classes in order", () => {
    expect(cn("base", false, undefined, "active", null)).toBe("base active");
  });
});
