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
      query: {
        content: [
          {
            type: "text",
            value: "A: <input lines here>\n",
          },
        ],
      },
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
      query: {
        content: [
          {
            type: "text",
            value: "A: <input lines here>    \n",
          },
        ],
      },
    });
  });
  test("separator", () => {
    const author = "A";
    const rep = {
      selStart: [0, 13],
      selEnd: [0, 13],
      alines: [],
      alltext: "This is test.    ",
      apool: {
        numToAttrib: {},
        attribToNum: {},
      },
    };
    expect(analyzeLines(author, rep)).toStrictEqual({
      cursor: [0, 13],
      query: {
        content: [
          {
            type: "text",
            value: "A: This is test.<input words here>    \n",
          },
        ],
      },
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
