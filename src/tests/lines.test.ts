import { describe, expect, test } from "@jest/globals";
import { DOMLines } from "../static/js/lines";

describe("DOMLines", () => {
  test("empty lines", () => {
    const lines = new DOMLines();
    expect(lines.getLine(0)).toBeNull();
  });
});
