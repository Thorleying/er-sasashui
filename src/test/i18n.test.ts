import { describe, expect, it } from "vitest";
import { I18N, isInitialSampleInput } from "../i18n";

describe("isInitialSampleInput", () => {
  it("recognizes both built-in DBML samples despite surrounding whitespace", () => {
    expect(isInitialSampleInput(I18N.zh.sample)).toBe(true);
    expect(isInitialSampleInput(` \n${I18N.en.sample}\n `)).toBe(true);
  });

  it("does not treat edited or user-provided DBML as the initial sample", () => {
    expect(isInitialSampleInput(`${I18N.zh.sample}\nTable Extra { id int [pk] }`)).toBe(false);
    expect(isInitialSampleInput("Table User { ID INT [pk] }")).toBe(false);
    expect(isInitialSampleInput("")).toBe(false);
  });
});
