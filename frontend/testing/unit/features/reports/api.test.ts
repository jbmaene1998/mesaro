import { describe, expect, it } from "vitest";

import { extractFilenameFromDisposition } from "@/features/reports/api";

describe("extractFilenameFromDisposition", () => {
  it("returns null when header is missing", () => {
    expect(extractFilenameFromDisposition(undefined)).toBeNull();
  });

  it("extracts quoted filename", () => {
    expect(extractFilenameFromDisposition('attachment; filename="report_10_2026-02-01_2026-02-28.csv"')).toBe(
      "report_10_2026-02-01_2026-02-28.csv"
    );
  });

  it("extracts utf-8 encoded filename", () => {
    expect(
      extractFilenameFromDisposition("attachment; filename*=UTF-8''report%20march%202026.csv")
    ).toBe("report march 2026.csv");
  });
});
