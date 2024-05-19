import { CompactionSettings, PluginSettings } from "./settings";
import {
  CompletionService,
  CompletionQuery,
  CompletionContentType,
  CompletionContent,
} from "./base";

const logPrefix = "[ep_kodama]";

const DEFAULT_MAX_IMAGE_SIZE = {
  width: 512,
  height: 512,
};

const DEFAULT_MAX_CONTENT_LENGTH = {
  beforeLength: 1024 * 20,
  afterLength: 1024,
};

const MARKER_PATTERN = /\<input\s+\S+\s+here\>/;

async function performImageCompaction(
  compactionSettings: CompactionSettings,
  content: CompletionContent
): Promise<CompletionContent> {
  if (content.type !== CompletionContentType.Image) {
    throw new Error(`Expected image content, got ${content.type}`);
  }
  if (compactionSettings.maxImageSize === undefined) {
    // compaction disabled
    return content;
  }
  let sharp;
  try {
    sharp = (await import("sharp")).default;
  } catch (err) {
    console.warn(
      logPrefix,
      "sharp is required for image compaction. skipped.",
      err
    );
    return content;
  }
  const imageSize = compactionSettings.maxImageSize;
  const dataURL = content.value;
  // convert dataURL to buffer
  const buffer = Buffer.from(dataURL.split(",")[1], "base64");

  const resizedBuffer = await sharp(buffer)
    .resize(imageSize.width, imageSize.height, {
      fit: "inside",
      withoutEnlargement: true,
    })
    .png()
    .toBuffer();
  const resizedDataURL = `data:image/png;base64,${resizedBuffer.toString(
    "base64"
  )}`;
  return {
    type: CompletionContentType.Image,
    value: resizedDataURL,
  };
}

async function performCompaction(
  compactionSettings: CompactionSettings,
  content: CompletionContent
): Promise<CompletionContent> {
  if (content.type === CompletionContentType.Image) {
    return performImageCompaction(compactionSettings, content);
  }
  return content;
}

function trimBefore(
  contents: CompletionContent[],
  beforeLength: number
): CompletionContent[] {
  const markerIndex = contents.findIndex(
    (content) =>
      content.type === CompletionContentType.Text &&
      content.value.search(MARKER_PATTERN) !== -1
  );
  if (markerIndex === -1) {
    throw new Error("No markers found");
  }
  const markerContent = contents[markerIndex];
  const markerText = markerContent.value;
  const markerPos = markerText.search(MARKER_PATTERN);
  if (markerPos > beforeLength) {
    const trimmedContent = {
      type: CompletionContentType.Text,
      value: markerText.substring(markerPos - beforeLength),
    };
    return [trimmedContent].concat(contents.slice(markerIndex + 1));
  }
  const remainingLength = beforeLength - markerPos;
  return tail(contents.slice(0, markerIndex), remainingLength).concat(
    contents.slice(markerIndex)
  );
}

function trimAfter(
  contents: CompletionContent[],
  afterLength: number
): CompletionContent[] {
  const markerIndex = contents.findIndex(
    (content) =>
      content.type === CompletionContentType.Text &&
      content.value.search(MARKER_PATTERN) !== -1
  );
  if (markerIndex === -1) {
    throw new Error("No markers found");
  }
  const markerContent = contents[markerIndex];
  const markerText = markerContent.value;
  const markerPos = markerText.search(MARKER_PATTERN);
  const markerMatch = markerText.substring(markerPos).match(MARKER_PATTERN);
  if (markerMatch === null) {
    throw new Error("Marker not found in marker content");
  }
  const markerEnd = markerPos + markerMatch[0].length;
  if (markerText.length - markerEnd > afterLength) {
    const trimmedContent = {
      type: CompletionContentType.Text,
      value: markerText.substring(0, markerEnd + afterLength),
    };
    return contents.slice(0, markerIndex).concat([trimmedContent]);
  }
  const remainingLength = afterLength - (markerText.length - markerEnd);
  return contents
    .slice(0, markerIndex + 1)
    .concat(head(contents.slice(markerIndex + 1), remainingLength));
}

function head(
  contents: CompletionContent[],
  remainingLength: number
): CompletionContent[] {
  if (contents.length === 0) {
    return contents;
  }
  const firstContent = contents[0];
  if (firstContent.value.length > remainingLength) {
    if (firstContent.type === CompletionContentType.Image) {
      // cannot trim image content
      return [];
    }
    const trimmedContent = {
      type: CompletionContentType.Text,
      value: firstContent.value.substring(0, remainingLength),
    };
    return [trimmedContent];
  }
  return [firstContent].concat(
    head(contents.slice(1), remainingLength - firstContent.value.length)
  );
}

function tail(
  contents: CompletionContent[],
  remainingLength: number
): CompletionContent[] {
  if (contents.length === 0) {
    return contents;
  }
  const lastContent = contents[contents.length - 1];
  if (lastContent.value.length > remainingLength) {
    if (lastContent.type === CompletionContentType.Image) {
      // cannot trim image content
      return [];
    }
    const trimmedContent = {
      type: CompletionContentType.Text,
      value: lastContent.value.substring(
        lastContent.value.length - remainingLength
      ),
    };
    return [trimmedContent];
  }
  return tail(
    contents.slice(0, -1),
    remainingLength - lastContent.value.length
  ).concat([lastContent]);
}

function trimContent(
  compactionSettings: CompactionSettings,
  contents: CompletionContent[]
): CompletionContent[] {
  if (compactionSettings.maxContentLength === undefined) {
    return contents;
  }
  const { beforeLength, afterLength } = compactionSettings.maxContentLength;
  let result = contents;
  if (beforeLength !== undefined) {
    result = trimBefore(result, beforeLength);
  }
  if (afterLength !== undefined) {
    result = trimAfter(result, afterLength);
  }
  return result;
}

export class CompletionServiceWithCompaction implements CompletionService {
  private pluginSettings: PluginSettings;

  private completionService: CompletionService;

  constructor(
    pluginSettings: PluginSettings,
    completionService: CompletionService
  ) {
    this.pluginSettings = pluginSettings;
    this.completionService = completionService;
  }

  async completion(query: CompletionQuery): Promise<string> {
    const { compaction } = this.pluginSettings;
    const compactionSettings = compaction ?? {
      maxImageSize: DEFAULT_MAX_IMAGE_SIZE,
      maxContentLength: DEFAULT_MAX_CONTENT_LENGTH,
    };
    const compactedQueryContents = query.content.map((content) =>
      performCompaction(compactionSettings, content)
    );
    const compactedQuery = await Promise.all(compactedQueryContents);
    console.debug(logPrefix, "image compacted query:", compactedQuery);
    const trimmedQuery = {
      content: trimContent(compactionSettings, compactedQuery),
    };
    console.debug(logPrefix, "trimmed query:", trimmedQuery);
    return this.completionService.completion(trimmedQuery);
  }
}
