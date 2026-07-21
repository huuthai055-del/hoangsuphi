import { describe, expect, test } from "bun:test";
import { getButtonClassName } from "@/components/ui/button";

describe("getButtonClassName", () => {
  test("uses semantic tokens and accessible states", () => {
    const className = getButtonClassName({ variant: "primary", size: "md" });
    expect(className).toContain("bg-primary");
    expect(className).toContain("focus-visible:ring-ring");
    expect(className).toContain("disabled:pointer-events-none");
  });

  test("supports full-width secondary actions", () => {
    const className = getButtonClassName({
      variant: "secondary",
      size: "lg",
      fullWidth: true,
    });
    expect(className).toContain("bg-secondary");
    expect(className).toContain("min-h-12");
    expect(className).toContain("w-full");
  });
});
