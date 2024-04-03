export enum PosType {
  Left,
  Right,
}

const SUPPORT_COMPLETION_MARKER = false;

export class DOMLines {
  private allLines: JQuery[];
  private completionMarker: JQuery | null = null;

  constructor() {
    this.allLines = [];
  }

  addLine(line: JQuery) {
    const lineId = line.attr("id");
    if (lineId && this.getLineIds().includes(lineId)) {
      return false;
    }
    this.allLines.push(line);
    return true;
  }

  getLine(index: number) {
    const lines = this.removeAndSort();
    if (index >= lines.length) {
      return null;
    }
    return lines[index];
  }

  getLocation(cursor: number[]) {
    const line = this.getLine(cursor[0]);
    if (!line) {
      return null;
    }
    const element = this.getElementFromPos(line, cursor[1]);
    if (!element) {
      return null;
    }
    const offset = element.element.offset();
    if (!offset) {
      return null;
    }
    const width = element.element.width();
    if (!width) {
      return null;
    }
    const x =
      element.posType === PosType.Left ? offset.left : offset.left + width;
    return {
      x,
      y: offset.top,
      posType: element.posType,
      element: element.element,
    };
  }

  private getLineIds() {
    return this.allLines
      .filter((line) => line.closest("html").length > 0)
      .map((line) => line.attr("id"));
  }

  private removeAndSort() {
    return this.allLines
      .filter((line) => line.closest("html").length > 0)
      .sort((a, b) => {
        const aOffset = a.offset();
        const bOffset = b.offset();
        if (!aOffset && !bOffset) {
          return 0;
        }
        if (!aOffset) {
          return -1;
        }
        if (!bOffset) {
          return 1;
        }
        return aOffset.top - bOffset.top;
      });
  }

  private getElementFromPos(
    element: JQuery,
    pos: number
  ): { posType: PosType; element: JQuery } | null {
    const children = element.children();
    if (pos === 0) {
      return {
        posType: PosType.Left,
        element: element,
      };
    }
    if (children.length === 0) {
      if (pos === element.text().length) {
        return {
          posType: PosType.Right,
          element: element,
        };
      }
      if (!SUPPORT_COMPLETION_MARKER) {
        return null;
      }
      if (this.completionMarker) {
        this.completionMarker.remove();
      }
      const text = element.text();
      const beforeText = text.substring(0, pos);
      const afterText = text.substring(pos);
      const html = `${beforeText}<span id="completion-marker"></span>${afterText}`;
      element.html(html);
      this.completionMarker = $("#completion-marker");
      return {
        posType: PosType.Left,
        element: this.completionMarker,
      };
    }
    let offset = 0;
    for (let i = 0; i < children.length; i++) {
      const child = $(children[i]);
      const text = child.text();
      if (text.length + offset >= pos) {
        return this.getElementFromPos(child, pos - offset);
      }
      offset += text.length;
    }
    return null;
  }
}
