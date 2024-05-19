import { describe, expect, test } from "@jest/globals";
import sharp from "sharp";
import { CompletionServiceWithCompaction } from "../completion/compaction";
import {
  CompletionContent,
  CompletionContentType,
  CompletionQuery,
} from "../completion/base";

describe("trimContent", () => {
  test("noTrimLines", async () => {
    const pluginSettings = {
      compaction: {
        maxContentLength: {
          beforeLength: 30,
          afterLength: 30,
        },
      },
    };
    const service = new CompletionServiceWithCompaction(pluginSettings, {
      completion: async (query: CompletionQuery) => JSON.stringify(query),
    });
    const contents: CompletionContent[] = [
      {
        type: CompletionContentType.Text,
        value: "a".repeat(20) + "\n<input lines here>\n" + "b".repeat(20),
      },
    ];
    const result = await service.completion({ content: contents });
    const parsed = JSON.parse(result) as CompletionQuery;
    expect(parsed.content).toHaveLength(1);
    expect(parsed.content[0].value).toBe(
      "a".repeat(20) + "\n<input lines here>\n" + "b".repeat(20)
    );
  });

  test("noTrimTexts", async () => {
    const pluginSettings = {
      compaction: {
        maxContentLength: {
          beforeLength: 50,
          afterLength: 50,
        },
      },
    };
    const service = new CompletionServiceWithCompaction(pluginSettings, {
      completion: async (query: CompletionQuery) => JSON.stringify(query),
    });
    const contents: CompletionContent[] = [
      {
        type: CompletionContentType.Text,
        value: "c".repeat(20),
      },
      {
        type: CompletionContentType.Text,
        value: "a".repeat(20) + "\n<input lines here>\n" + "b".repeat(20),
      },
      {
        type: CompletionContentType.Text,
        value: "d".repeat(20),
      },
    ];
    const result = await service.completion({ content: contents });
    const parsed = JSON.parse(result) as CompletionQuery;
    expect(parsed.content).toHaveLength(3);
    expect(parsed.content[0].value).toBe("c".repeat(20));
    expect(parsed.content[1].value).toBe(
      "a".repeat(20) + "\n<input lines here>\n" + "b".repeat(20)
    );
    expect(parsed.content[2].value).toBe("d".repeat(20));
  });

  test("trimContentLines", async () => {
    const pluginSettings = {
      compaction: {
        maxContentLength: {
          beforeLength: 10,
          afterLength: 10,
        },
      },
    };
    const service = new CompletionServiceWithCompaction(pluginSettings, {
      completion: async (query: CompletionQuery) => JSON.stringify(query),
    });
    const contents: CompletionContent[] = [
      {
        type: CompletionContentType.Text,
        value: "a".repeat(20) + "\n<input lines here>\n" + "b".repeat(20),
      },
    ];
    const result = await service.completion({ content: contents });
    const parsed = JSON.parse(result) as CompletionQuery;
    expect(parsed.content).toHaveLength(1);
    expect(parsed.content[0].value).toBe(
      "a".repeat(9) + "\n<input lines here>\n" + "b".repeat(9)
    );
  });

  test("trimContentWords", async () => {
    const pluginSettings = {
      compaction: {
        maxContentLength: {
          beforeLength: 10,
          afterLength: 10,
        },
      },
    };
    const service = new CompletionServiceWithCompaction(pluginSettings, {
      completion: async (query: CompletionQuery) => JSON.stringify(query),
    });
    const contents: CompletionContent[] = [
      {
        type: CompletionContentType.Text,
        value: "a".repeat(20) + "<input words here>" + "b".repeat(20),
      },
    ];
    const result = await service.completion({ content: contents });
    const parsed = JSON.parse(result) as CompletionQuery;
    expect(parsed.content).toHaveLength(1);
    expect(parsed.content[0].value).toBe(
      "a".repeat(10) + "<input words here>" + "b".repeat(10)
    );
  });

  test("trimContentTexts", async () => {
    const pluginSettings = {
      compaction: {
        maxContentLength: {
          beforeLength: 30,
          afterLength: 30,
        },
      },
    };
    const service = new CompletionServiceWithCompaction(pluginSettings, {
      completion: async (query: CompletionQuery) => JSON.stringify(query),
    });
    const contents: CompletionContent[] = [
      {
        type: CompletionContentType.Text,
        value: "c".repeat(19) + "_",
      },
      {
        type: CompletionContentType.Text,
        value: "a".repeat(20) + "<input words here>" + "b".repeat(20),
      },
      {
        type: CompletionContentType.Text,
        value: "_" + "d".repeat(19),
      },
    ];
    const result = await service.completion({ content: contents });
    const parsed = JSON.parse(result) as CompletionQuery;
    expect(parsed.content).toHaveLength(3);
    expect(parsed.content[0].value).toBe("c".repeat(9) + "_");
    expect(parsed.content[1].value).toBe(
      "a".repeat(20) + "<input words here>" + "b".repeat(20)
    );
    expect(parsed.content[2].value).toBe("_" + "d".repeat(9));
  });

  test("trimContentTextsAndImages", async () => {
    const imageDataBuffer = await sharp({
      create: {
        width: 50,
        height: 50,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 1 },
      },
    })
      .png()
      .toBuffer();
    const dataURL = `data:image/png;base64,${imageDataBuffer.toString(
      "base64"
    )}`;
    const pluginSettings = {
      compaction: {
        maxContentLength: {
          beforeLength: 30 + dataURL.length,
          afterLength: 30 + dataURL.length,
        },
      },
    };
    const service = new CompletionServiceWithCompaction(pluginSettings, {
      completion: async (query: CompletionQuery) => JSON.stringify(query),
    });
    const contents: CompletionContent[] = [
      {
        type: CompletionContentType.Text,
        value: "c".repeat(19) + "_",
      },
      {
        type: CompletionContentType.Image,
        value: dataURL,
      },
      {
        type: CompletionContentType.Text,
        value: "a".repeat(20) + "<input words here>" + "b".repeat(20),
      },
      {
        type: CompletionContentType.Image,
        value: dataURL,
      },
      {
        type: CompletionContentType.Text,
        value: "_" + "d".repeat(19),
      },
    ];
    const result = await service.completion({ content: contents });
    const parsed = JSON.parse(result) as CompletionQuery;
    expect(parsed.content).toHaveLength(5);
    expect(parsed.content[0].value).toBe("c".repeat(9) + "_");
    expect(parsed.content[1].value).toBe(dataURL);
    expect(parsed.content[2].value).toBe(
      "a".repeat(20) + "<input words here>" + "b".repeat(20)
    );
    expect(parsed.content[3].value).toBe(dataURL);
    expect(parsed.content[4].value).toBe("_" + "d".repeat(9));
  });

  test("trimContentTextsAndLargeImages", async () => {
    const imageDataBuffer = await sharp({
      create: {
        width: 50,
        height: 50,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 1 },
      },
    })
      .png()
      .toBuffer();
    const dataURL = `data:image/png;base64,${imageDataBuffer.toString(
      "base64"
    )}`;
    const pluginSettings = {
      compaction: {
        maxContentLength: {
          beforeLength: 30 + dataURL.length,
          afterLength: 30 + dataURL.length,
        },
      },
    };
    const service = new CompletionServiceWithCompaction(pluginSettings, {
      completion: async (query: CompletionQuery) => JSON.stringify(query),
    });
    const contents: CompletionContent[] = [
      {
        type: CompletionContentType.Image,
        value: dataURL,
      },
      {
        type: CompletionContentType.Text,
        value: "c".repeat(19) + "_",
      },
      {
        type: CompletionContentType.Text,
        value: "a".repeat(20) + "<input words here>" + "b".repeat(20),
      },
      {
        type: CompletionContentType.Text,
        value: "_" + "d".repeat(19),
      },
      {
        type: CompletionContentType.Image,
        value: dataURL,
      },
    ];
    const result = await service.completion({ content: contents });
    const parsed = JSON.parse(result) as CompletionQuery;
    expect(parsed.content).toHaveLength(3);
    expect(parsed.content[0].value).toBe("c".repeat(19) + "_");
    expect(parsed.content[1].value).toBe(
      "a".repeat(20) + "<input words here>" + "b".repeat(20)
    );
    expect(parsed.content[2].value).toBe("_" + "d".repeat(19));
  });
});

describe("resizeImage", () => {
  test("noResize", async () => {
    const pluginSettings = {
      compaction: {
        maxImageSize: {
          width: 100,
          height: 100,
        },
      },
    };
    const service = new CompletionServiceWithCompaction(pluginSettings, {
      completion: async (query: CompletionQuery) => JSON.stringify(query),
    });
    const imageDataBuffer = await sharp({
      create: {
        width: 50,
        height: 50,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 1 },
      },
    })
      .png()
      .toBuffer();
    const dataURL = `data:image/png;base64,${imageDataBuffer.toString(
      "base64"
    )}`;
    const contents: CompletionContent[] = [
      {
        type: CompletionContentType.Image,
        value: dataURL,
      },
    ];
    const result = await service.completion({ content: contents });
    const parsed = JSON.parse(result) as CompletionQuery;
    expect(parsed.content).toHaveLength(1);
    expect(parsed.content[0].value).toBe(dataURL);
  });

  test("resize", async () => {
    const pluginSettings = {
      compaction: {
        maxImageSize: {
          width: 100,
          height: 100,
        },
      },
    };
    const service = new CompletionServiceWithCompaction(pluginSettings, {
      completion: async (query: CompletionQuery) => JSON.stringify(query),
    });
    const imageDataBuffer = await sharp({
      create: {
        width: 200,
        height: 200,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 1 },
      },
    })
      .png()
      .toBuffer();
    const dataURL = `data:image/png;base64,${imageDataBuffer.toString(
      "base64"
    )}`;
    const contents: CompletionContent[] = [
      {
        type: CompletionContentType.Image,
        value: dataURL,
      },
    ];
    const result = await service.completion({ content: contents });
    const parsed = JSON.parse(result) as CompletionQuery;
    expect(parsed.content).toHaveLength(1);
    expect(parsed.content[0].value).not.toBe(dataURL);

    const resizedBuffer = Buffer.from(
      parsed.content[0].value.split(",")[1],
      "base64"
    );
    const metadata = await sharp(resizedBuffer).metadata();
    expect(metadata.width).toBe(100);
    expect(metadata.height).toBe(100);
  });

  test("resizeWithAspectRatio", async () => {
    const pluginSettings = {
      compaction: {
        maxImageSize: {
          width: 100,
          height: 100,
        },
      },
    };
    const service = new CompletionServiceWithCompaction(pluginSettings, {
      completion: async (query: CompletionQuery) => JSON.stringify(query),
    });
    const imageDataBuffer = await sharp({
      create: {
        width: 200,
        height: 50,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 1 },
      },
    })
      .png()
      .toBuffer();
    const dataURL = `data:image/png;base64,${imageDataBuffer.toString(
      "base64"
    )}`;
    const contents: CompletionContent[] = [
      {
        type: CompletionContentType.Image,
        value: dataURL,
      },
    ];
    const result = await service.completion({ content: contents });
    const parsed = JSON.parse(result) as CompletionQuery;
    expect(parsed.content).toHaveLength(1);
    expect(parsed.content[0].value).not.toBe(dataURL);

    const resizedBuffer = Buffer.from(
      parsed.content[0].value.split(",")[1],
      "base64"
    );
    const metadata = await sharp(resizedBuffer).metadata();
    expect(metadata.width).toBe(100);
    expect(metadata.height).toBe(25);
  });

  test("resizeJPEG", async () => {
    const pluginSettings = {
      compaction: {
        maxImageSize: {
          width: 100,
          height: 100,
        },
      },
    };
    const service = new CompletionServiceWithCompaction(pluginSettings, {
      completion: async (query: CompletionQuery) => JSON.stringify(query),
    });
    const imageDataBuffer = await sharp({
      create: {
        width: 200,
        height: 200,
        channels: 3,
        background: { r: 255, g: 255, b: 255 },
      },
    })
      .jpeg()
      .toBuffer();
    const dataURL = `data:image/jpeg;base64,${imageDataBuffer.toString(
      "base64"
    )}`;
    const contents: CompletionContent[] = [
      {
        type: CompletionContentType.Image,
        value: dataURL,
      },
    ];
    const result = await service.completion({ content: contents });
    const parsed = JSON.parse(result) as CompletionQuery;
    expect(parsed.content).toHaveLength(1);
    expect(parsed.content[0].value).not.toBe(dataURL);

    expect(parsed.content[0].value).toMatch(/^data:image\/png;base64,/);
    const resizedBuffer = Buffer.from(
      parsed.content[0].value.split(",")[1],
      "base64"
    );
    const metadata = await sharp(resizedBuffer).metadata();
    expect(metadata.width).toBe(100);
    expect(metadata.height).toBe(100);
  });
});
