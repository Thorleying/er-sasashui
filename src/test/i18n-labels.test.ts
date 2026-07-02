import { describe, expect, it } from "vitest";
import { I18N } from "../i18n";

describe("preview labels", () => {
  it("uses concise localized preview titles", () => {
    expect(I18N.zh.cardPreviewTitle).toBe("预览");
    expect(I18N.en.cardPreviewTitle).toBe("Preview");
  });
});
