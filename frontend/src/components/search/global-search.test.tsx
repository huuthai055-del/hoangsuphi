import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const frontendRoot = join(process.cwd());
const searchComponentPath = join(
  frontendRoot,
  "src",
  "components",
  "search",
  "global-search.tsx"
);
const searchContent = readFileSync(searchComponentPath, "utf-8");

describe("Global Search Client Component Architecture & Accessibility", () => {
  test("is a Client Component with 'use client'", () => {
    expect(searchContent).toContain('"use client"');
  });

  test("uses useId for accessible combobox/listbox ID generation", () => {
    expect(searchContent).toContain("useId()");
    expect(searchContent).toContain('role="combobox"');
    expect(searchContent).toContain('role="listbox"');
    expect(searchContent).toContain('role="option"');
    expect(searchContent).toContain("aria-autocomplete");
    expect(searchContent).toContain("aria-controls");
    expect(searchContent).toContain("aria-expanded");
    expect(searchContent).toContain("aria-activedescendant");
  });

  test("implements Vietnamese IME composition handling", () => {
    expect(searchContent).toContain("isComposing");
    expect(searchContent).toContain("onCompositionStart");
    expect(searchContent).toContain("onCompositionEnd");
    expect(searchContent).toContain("if (isComposing)");
  });

  test("calls same-origin /api/search instead of backend host directly", () => {
    expect(searchContent).toContain('browserApiRequest("/api/search"');
    expect(searchContent).not.toContain("localhost:3001");
    expect(searchContent).not.toContain("INTERNAL_BACKEND_URL");
    expect(searchContent).not.toContain("NEXT_PUBLIC_INTERNAL_BACKEND_URL");
  });

  test("includes screen reader aria-live polite region for status updates", () => {
    expect(searchContent).toContain('aria-live="polite"');
  });

  test("implements pointerdown click outside handler", () => {
    expect(searchContent).toContain("pointerdown");
  });

  test("uses the required debounce and aborts obsolete autocomplete requests", () => {
    expect(searchContent).toContain("new AbortController()");
    expect(searchContent).toContain("controller.abort()");
    expect(searchContent).toContain("}, 300);");
    expect(searchContent).toContain("timeoutMs: 3000");
  });
});
