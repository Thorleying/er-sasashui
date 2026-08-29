import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const readSource = (relativePath: string) =>
  readFileSync(new URL(relativePath, import.meta.url), "utf8");

describe("diagnostic overlay animations", () => {
  it("shows parser warnings after an animation frame so fade-in transitions can run", () => {
    const source = readSource("../hooks/useGraph.ts");
    const showParserWarnings = source.match(
      /const showParserWarnings = \(warnings: ParserWarning\[\]\) => \{([\s\S]*?)\n  \};/,
    )?.[1];

    expect(showParserWarnings).toBeTruthy();
    expect(showParserWarnings).toContain("setParserWarningsVisible(false)");
    expect(showParserWarnings).toContain("scheduleParserWarningFadeIn()");
    expect(source).toContain("const scheduleParserWarningFadeIn = () =>");
    expect(source).toContain("requestAnimationFrame");
    expect(showParserWarnings).not.toContain("setParserWarningsVisible(warnings.length > 0)");
  });

  it("routes parse errors through App message feedback instead of canvas overlay", () => {
    const app = readSource("../App.tsx");
    const workspace = readSource("../features/editor/EditorWorkspace.tsx");
    const feedback = readSource("../app/feedback.ts");

    expect(app).toContain("showError(error)");
    expect(app).toContain('from "./app/feedback"');
    expect(feedback).toContain("message.error");
    expect(workspace).not.toContain("props.error");
    expect(workspace).not.toContain('className="diagram-error-overlay');
  });

  it("defines hidden and visible CSS states for error overlay transitions", () => {
    const css = readSource("../../css/style.css");

    expect(css).toContain(".diagram-error-overlay.is-visible");
    expect(css).toContain("@starting-style");
    expect(css).toContain(".parser-warning-toast.is-visible");
    expect(css).toMatch(/\.diagram-error-overlay\s*\{[\s\S]*opacity:\s*0;/);
    expect(css).toMatch(/\.diagram-error-overlay\.is-visible\s*\{[\s\S]*opacity:\s*1;/);
  });
});
