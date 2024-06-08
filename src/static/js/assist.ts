import { CompletionSettings } from "ep_etherpad-lite/node/utils/Settings";
import {
  AceEditEventContext,
  PostAceInitContext,
  Rep,
} from "ep_etherpad-lite/hooks";
import { DOMLines } from "./lines";
import { getAceEditorOffset } from "./ace";
import {
  requestCompletion,
  CompletionQuery,
  CompletionContentType,
  CompletionContent,
} from "./completion";

const logPrefix = "[ep_kodama/hashview]";

type CompletionContext = {
  query: CompletionQuery;
  cursor: number[];
};

const DEFAULT_TIME_TO_WAIT_FOR_COMPLETION = 0.5;
const DEFAULT_PREVIOUS_SEPARATOR = "[.,!?\"';:]$";

let completionSettings: CompletionSettings = {
  previousSeparator: DEFAULT_PREVIOUS_SEPARATOR,
  waitSeconds: DEFAULT_TIME_TO_WAIT_FOR_COMPLETION,
};

let lastContext: CompletionContext | null = null;
let lineDOMNodes: DOMLines = new DOMLines();
let completionMarker: JQuery | null = null;
let completionResult: string | null = null;
let lastCompletionLine: {
  element: JQuery;
  appendText: (text: string) => void;
} | null = null;
let keyPressHandlerAttached = false;

/**
 * Load settings from the server.
 */
function loadSettings() {
  $.get("/kodama/settings", (data) => {
    console.debug(logPrefix, "Settings", data);
    completionSettings = data.completion ?? {};
  });
}

/**
 * Check if the line is currently being edited.
 * The following conditions are satisfied, it is considered *not* currently being edited.
 *
 * - The previous text from the cursor should be checked whether matched by the previousSeparator pattern
 *   if the cursor is not at the beginning of the line.
 * - The next text from the cursor should be checked whether it is empty.
 *
 * @param line the line text
 * @param index the cursor position
 * @returns whether the line is currently being edited
 */
function isCurrentlyEditing(line: string, index: number) {
  const trimmed = line.trim();
  if (trimmed.length === 0) {
    return false;
  }
  const previous = line.substring(0, index);
  const next = line.substring(index);
  if (previous.trim().length > 0 && !/\s$/.test(previous)) {
    const previousSeparator =
      completionSettings?.previousSeparator ?? DEFAULT_PREVIOUS_SEPARATOR;
    if (!new RegExp(previousSeparator).test(previous)) {
      return true;
    }
  }
  return next.trim().length > 0;
}

export function analyzeLines(
  currentAuthor: string,
  rep: Rep
): CompletionContext | null {
  const { selStart, selEnd, alines, alltext, apool } = rep;
  if (!apool) {
    return null;
  }
  const { numToAttrib } = apool;
  if (!alines || !selStart || !selEnd || !numToAttrib) {
    return null;
  }
  if (!(selStart[0] === selEnd[0] && selStart[1] === selEnd[1])) {
    // selected
    return null;
  }
  let text: string | null = "";
  const content: CompletionContent[] = [];
  alltext.split("\n").forEach((line, index) => {
    if (text === null) {
      return;
    }
    const aline = alines[index];
    const attrib = aline ? aline.split("|")[0] : "";
    const attribNums = attrib
      .split("*")
      .filter((x) => x.match(/\d+/))
      .map((x) => parseInt(x, 10));
    const attribs = attribNums.map((num) => numToAttrib[num]);
    const author = attribs.find((attr) => attr && attr[0] === "author");
    let mline = line;
    if (index === selStart[0]) {
      if (isCurrentlyEditing(line, selStart[1])) {
        text = null;
        return;
      }
      const nexttext = line.substring(selStart[1]);
      const type = line.trim().length === 0 ? "lines" : "words";
      mline =
        (selStart[1] > 0
          ? `${currentAuthor}: ${line.substring(0, selStart[1])}<input ${type} here>`
          : `${currentAuthor}: <input ${type} here>`) + nexttext;
      text += `${mline}\n`;
      return;
    }
    if (!author) {
      text += `${mline}\n`;
    } else {
      text += `${author[1]}: ${mline}\n`;
    }
    const img = attribs.find((attr) => attr && attr[0] === "img");
    if (!img) {
      return;
    }
    // Push image
    content.push({
      type: CompletionContentType.Text,
      value: text,
    });
    text = "";
    content.push({
      type: CompletionContentType.Image,
      value: img[1],
    });
  });
  if (text === null) {
    return null;
  }
  return {
    query: {
      content: content.concat([
        {
          type: CompletionContentType.Text,
          value: text,
        },
      ]),
    },
    cursor: [selStart[0], selStart[1]],
  };
}

function completionQueryEquals(a: CompletionQuery, b: CompletionQuery) {
  if (a.content.length !== b.content.length) {
    return false;
  }
  for (let i = 0; i < a.content.length; i++) {
    if (a.content[i].type !== b.content[i].type) {
      return false;
    }
    if (a.content[i].value !== b.content[i].value) {
      return false;
    }
  }
  return true;
}

function completionContextEquals(
  a: CompletionContext | null,
  b: CompletionContext | null
) {
  if (a === null && b === null) {
    return true;
  }
  if (a === null || b === null) {
    return false;
  }
  return (
    completionQueryEquals(a.query, b.query) &&
    a.cursor[0] === b.cursor[0] &&
    a.cursor[1] === b.cursor[1]
  );
}

function attachKeyPressHandler(context: AceEditEventContext) {
  if (keyPressHandlerAttached) {
    return;
  }
  const { editorInfo, rep } = context;
  const { ace_setOnKeyDown } = editorInfo;
  if (!ace_setOnKeyDown) {
    return;
  }
  ace_setOnKeyDown((event) => {
    // check the key code is tab
    if (event.keyCode !== 9) {
      return;
    }
    if (!event.shiftKey) {
      return;
    }
    if (!completionResult) {
      return;
    }
    if (!lastCompletionLine) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    completionMarker?.hide();
    lastCompletionLine.appendText(completionResult);
    if (!editorInfo.editor) {
      throw new Error("editor is not set");
    }
    const lastCompletionResult = completionResult;
    editorInfo.editor.callWithAce(
      (ace) => {
        if (!rep.selStart || !rep.selEnd) {
          throw new Error("selStart or selEnd is not set");
        }
        if (!ace.ace_performSelectionChange) {
          throw new Error("ace_performSelectionChange is not set");
        }
        ace.ace_performSelectionChange(
          [rep.selStart[0], rep.selStart[1] + lastCompletionResult.length],
          [rep.selEnd[0], rep.selEnd[1] + lastCompletionResult.length],
          true
        );
      },
      "kodama_completion",
      true
    );
    completionResult = null;
    lastCompletionLine = null;
  });
  keyPressHandlerAttached = true;
}

function getOpenAIError(err: any): {
  status: number;
  code?: string;
  error?: {
    message?: string;
  };
} | null {
  if (err.status !== 500) {
    return null;
  }
  const { responseJSON } = err;
  if (responseJSON === undefined) {
    return null;
  }
  if (responseJSON.status === undefined) {
    return null;
  }
  return responseJSON;
}

function createCompletionLabel(result: string) {
  const content = $("<span>")
    .addClass("kodama-completion-result-content")
    .text(result);
  const help = $("<span>")
    .addClass("kodama-completion-result-help")
    .html(
      "Press <span class='kodama-key'>SHIFT</span>+<span class='kodama-key'>TAB</span> to apply"
    );
  return $("<span>")
    .addClass("kodama-completion-result")
    .append(content)
    .append(help);
}

exports.postAceInit = (hook: any, context: PostAceInitContext) => {
  const { ace } = context;
  console.debug(logPrefix, "AceEditor", ace);
  loadSettings();
};

exports.aceEditEvent = (hook: string, context: AceEditEventContext) => {
  const { rep } = context;
  const { author } = context.documentAttributeManager;
  if (!author) {
    return;
  }
  attachKeyPressHandler(context);
  const analyzed = analyzeLines(author, rep);
  if (completionContextEquals(lastContext, analyzed)) {
    return;
  }
  completionMarker?.hide();
  completionResult = null;
  if (analyzed === null) {
    return;
  }
  lastContext = analyzed;
  setTimeout(() => {
    if (!completionContextEquals(lastContext, analyzed)) {
      return;
    }
    const location = lineDOMNodes.getLocation(analyzed.cursor);
    console.debug(
      logPrefix,
      "CompletionContext",
      lastContext,
      context,
      location
    );
    if (!location) {
      console.warn(logPrefix, "Failed to get location", analyzed.cursor);
      return;
    }
    const editorContainer = $("body");
    if (!editorContainer) {
      console.warn(logPrefix, "Failed to get body");
      return;
    }
    const { x, y } = location;
    const containerOffset = getAceEditorOffset();
    if (!containerOffset) {
      console.warn(logPrefix, "Failed to get container offset");
      return;
    }
    const absoluteX = containerOffset.left + x;
    const absoluteY = containerOffset.top + y;
    if (!completionMarker) {
      completionMarker = $("<div>").addClass("kodama-completion-marker");
      editorContainer.append(completionMarker);
    }
    completionMarker.removeClass("kodama-completion-error").css({
      left: absoluteX,
      top: absoluteY,
    });
    completionMarker.text("Loading...");
    completionMarker.show();
    lastCompletionLine = location;
    requestCompletion(analyzed.query)
      .then((data) => {
        if (!completionContextEquals(lastContext, analyzed)) {
          return;
        }
        if (!completionMarker) {
          return;
        }
        completionResult = data.result;
        completionMarker
          .empty()
          .append(createCompletionLabel(data.result))
          .removeClass("kodama-completion-error");
      })
      .catch((err) => {
        const openAIError = getOpenAIError(err);
        if (openAIError !== null) {
          console.error(
            logPrefix,
            "Failed to get completion (OpenAI)",
            openAIError
          );
          if (!completionMarker) {
            return;
          }
          let message = "Unknown error";
          if (openAIError.error?.message) {
            message = openAIError.error.message;
          } else if (openAIError.code) {
            message = openAIError.code;
          } else {
            message = `Status code: ${openAIError.status}`;
          }
          completionMarker
            .text("OpenAI API error: " + message)
            .addClass("kodama-completion-error");
          return;
        }
        console.error(logPrefix, "Failed to get completion", err);
        if (!completionMarker) {
          return;
        }
        completionMarker
          .text("Failed to get completion")
          .addClass("kodama-completion-error");
      });
  }, (completionSettings.waitSeconds ?? DEFAULT_TIME_TO_WAIT_FOR_COMPLETION) * 1000);
};

exports.acePostWriteDomLineHTML = (hook: any, context: any) => {
  const node = $(context.node);
  const r = lineDOMNodes.addLine(node);
  if (!r) {
    console.warn(logPrefix, "Duplicate line", node);
  }
};
