import {
  AceEditEventContext,
  PostAceInitContext,
  Rep,
} from "ep_etherpad-lite/hooks";
import { DOMLines } from "./lines";
import { getAceEditorOffset } from "./ace";
import { requestCompletion } from "./completion";

const logPrefix = "[ep_kodama/hashview]";

type CompletionContext = {
  query: string;
  cursor: number[];
};

const TIME_TO_WAIT_FOR_COMPLETION = 500;

let lastContext: CompletionContext | null = null;
let lineDOMNodes: DOMLines = new DOMLines();
let completionMarker: JQuery | null = null;
let completionResult: string | null = null;
let lastCompletionLine: JQuery | null = null;
let keyPressHandlerAttached = false;

function analyzeLines(
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
      if (
        selStart[1] > 0 &&
        (line.substring(selStart[1] - 1).match(/^\S+.*/) ||
          line.substring(selStart[1]).match(/^\S+.*/))
      ) {
        // currently editing
        text = null;
        return;
      }
      const nexttext = line.substring(selStart[1]);
      const type = line.trim().length === 0 ? "lines" : "statement";
      mline =
        (selStart[1] > 0
          ? `${line.substring(0, selStart[1])}<input ${type} here>`
          : `${currentAuthor}: <input ${type} here>`) + nexttext;
      text += `${mline}\n`;
      return;
    }
    if (!author) {
      text += `${mline}\n`;
      return;
    }
    text += `${author[1]}: ${mline}\n`;
  });
  if (text === null) {
    return null;
  }
  return {
    query: text,
    cursor: [selStart[0], selStart[1]],
  };
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
    a.query === b.query &&
    a.cursor[0] === b.cursor[0] &&
    a.cursor[1] === b.cursor[1]
  );
}

function attachKeyPressHandler(context: AceEditEventContext) {
  if (keyPressHandlerAttached) {
    return;
  }
  const { editorInfo } = context;
  const { ace_setOnKeyDown } = editorInfo;
  if (!ace_setOnKeyDown) {
    return;
  }
  ace_setOnKeyDown((event) => {
    // check the key code is tab
    console.log(
      logPrefix,
      "Keydown",
      event,
      completionResult,
      lastCompletionLine
    );
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
    lastCompletionLine.after($("<span>").text(completionResult));
    completionResult = null;
    lastCompletionLine = null;
  });
  keyPressHandlerAttached = true;
}

exports.postAceInit = (hook: any, context: PostAceInitContext) => {
  const { ace } = context;
  console.debug(logPrefix, "AceEditor", ace);
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
      completionMarker = $("<div>").addClass("codama-completion-marker");
      editorContainer.append(completionMarker);
    }
    completionMarker.removeClass("codama-completion-error").css({
      left: absoluteX,
      top: absoluteY,
    });
    completionMarker.text("Loading...");
    completionMarker.show();
    lastCompletionLine = location.element;
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
          .text(data.result)
          .removeClass("codama-completion-error");
      })
      .catch((err) => {
        console.error(logPrefix, "Failed to get completion", err);
        if (!completionMarker) {
          return;
        }
        completionMarker
          .text("Failed to get completion")
          .addClass("codama-completion-error");
      });
  }, TIME_TO_WAIT_FOR_COMPLETION);
};

exports.acePostWriteDomLineHTML = (hook: any, context: any) => {
  const node = $(context.node);
  const r = lineDOMNodes.addLine(node);
  if (!r) {
    console.warn(logPrefix, "Duplicate line", node);
  }
};
