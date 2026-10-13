import { describe, expect, it } from "vitest";

import { canCombineTables, normalizeTableArea } from "@/features/tables/tableArea";

describe("normalizeTableArea", () => {
  it("trims and lowercases", () => {
    expect(normalizeTableArea("  Main Hall ")).toBe("main hall");
  });
});

describe("canCombineTables", () => {
  it("allows same area", () => {
    expect(
      canCombineTables([
        { area: "Main hall", allowCrossAreaCombine: false },
        { area: "Main hall", allowCrossAreaCombine: false }
      ])
    ).toBe(true);
  });

  it("blocks different areas without cross-area flag", () => {
    expect(
      canCombineTables([
        { area: "Main hall", allowCrossAreaCombine: false },
        { area: "Terrace", allowCrossAreaCombine: false }
      ])
    ).toBe(false);
  });

  it("allows different areas when one table opts into cross-area", () => {
    expect(
      canCombineTables([
        { area: "Main hall", allowCrossAreaCombine: false },
        { area: "Terrace", allowCrossAreaCombine: true }
      ])
    ).toBe(true);
  });
});
