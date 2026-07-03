import { describe, expect, it } from "vitest";
import { canPlaceLegendInPreviewHeader } from "../legendPlacement";

describe("canPlaceLegendInPreviewHeader", () => {
  it("keeps the legend in the preview header when title, legend, actions, and gaps fit", () => {
    expect(
      canPlaceLegendInPreviewHeader({
        headerWidth: 700,
        horizontalPadding: 48,
        titleWidth: 150,
        legendWidth: 310,
        actionsWidth: 160,
        gap: 16,
      }),
    ).toBe(true);
  });

  it("moves the legend above when the preview header is one pixel too narrow", () => {
    expect(
      canPlaceLegendInPreviewHeader({
        headerWidth: 689,
        horizontalPadding: 48,
        titleWidth: 150,
        legendWidth: 310,
        actionsWidth: 160,
        gap: 16,
      }),
    ).toBe(false);
  });

  it("reserves the preview title and action buttons before deciding if the legend fits", () => {
    expect(
      canPlaceLegendInPreviewHeader({
        headerWidth: 600,
        horizontalPadding: 48,
        titleWidth: 150,
        legendWidth: 350,
        actionsWidth: 160,
        gap: 16,
      }),
    ).toBe(false);
  });
});
