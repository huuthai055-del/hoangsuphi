import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  HARVEST_STAGE_LABELS,
  formatHarvestDate,
} from "@/lib/home/homepage-loaders";

const frontendRoot = join(process.cwd());
const sectionPath = join(
  frontendRoot,
  "src",
  "components",
  "home",
  "harvest-status-section.tsx"
);
const sectionContent = readFileSync(sectionPath, "utf-8");

describe("HarvestStatusSection Component & Loader Contract", () => {
  test("HarvestStatusSection is a Server Component without 'use client'", () => {
    expect(sectionContent).not.toContain('"use client"');
  });

  test("uses semantic section with aria-labelledby and H2 heading", () => {
    expect(sectionContent).toContain('aria-labelledby="harvest-status-heading"');
    expect(sectionContent).toContain('id="harvest-status-heading"');
    expect(sectionContent).toContain("<h2");
    expect(sectionContent).toContain("Tình trạng mùa vụ");
  });

  test("contains accessible time element and fallback link", () => {
    expect(sectionContent).toContain("<time");
    expect(sectionContent).toContain('href="/tinh-trang-mua-vu"');
    expect(sectionContent).toContain("Thông tin mùa vụ đang được cập nhật.");
  });

  test("maps all exact backend harvest stage enums to Vietnamese labels", () => {
    expect(HARVEST_STAGE_LABELS.PREPARING).toBe("Đang làm đất");
    expect(HARVEST_STAGE_LABELS.TRANSPLANTING).toBe("Đang cấy lúa");
    expect(HARVEST_STAGE_LABELS.GREEN).toBe("Lúa xanh mướt");
    expect(HARVEST_STAGE_LABELS.RIPENING).toBe("Lúa chớm chín");
    expect(HARVEST_STAGE_LABELS.GOLDEN).toBe("Lúa chín vàng");
    expect(HARVEST_STAGE_LABELS.HARVESTING).toBe("Đang gặt hái");
    expect(HARVEST_STAGE_LABELS.OFF_SEASON).toBe("Thời gian nghỉ mùa");
  });

  test("formatHarvestDate handles valid ISO dates and invalid inputs safely", () => {
    expect(formatHarvestDate("2026-07-20T10:00:00.000Z")).toBe("20/07/2026");
    expect(formatHarvestDate("invalid-date")).toBe("");
  });
});
