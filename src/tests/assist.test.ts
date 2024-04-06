import { describe, expect, test } from "@jest/globals";
import { analyzeLines } from "../static/js/assist";

describe("analyzeLines", () => {
  test("empty lines", () => {
    const author = "A";
    const rep = {
      selStart: [0, 0],
      selEnd: [0, 0],
      alines: [],
      alltext: "",
      apool: {
        numToAttrib: {},
        attribToNum: {},
      },
    };
    expect(analyzeLines(author, rep)).toStrictEqual({
      cursor: [0, 0],
      query: "A: <input lines here>\n",
    });
  });
  test("whitespaces", () => {
    const author = "A";
    const rep = {
      selStart: [0, 0],
      selEnd: [0, 0],
      alines: [],
      alltext: "    ",
      apool: {
        numToAttrib: {},
        attribToNum: {},
      },
    };
    expect(analyzeLines(author, rep)).toStrictEqual({
      cursor: [0, 0],
      query: "A: <input lines here>    \n",
    });
  });
  test("inputting", () => {
    const author = "A";
    const rep = {
      selStart: [0, 2],
      selEnd: [0, 2],
      alines: [],
      alltext: " A",
      apool: {
        numToAttrib: {},
        attribToNum: {},
      },
    };
    expect(analyzeLines(author, rep)).toBeNull();
  });
  test("selected", () => {
    const author = "A";
    const rep = {
      selStart: [0, 0],
      selEnd: [0, 1],
      alines: [],
      alltext: " ",
      apool: {
        numToAttrib: {},
        attribToNum: {},
      },
    };
    expect(analyzeLines(author, rep)).toBeNull();
  });
});
