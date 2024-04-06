const SUPPORT_COMPLETION_MARKER = false;

export type LineMarker = {
  element: JQuery;
  appendText: (text: string) => void;
};

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
    const offset = element.offset();
    if (!offset) {
      return null;
    }
    const x = offset.left;
    return {
      x,
      y: offset.top,
      element: element,
      appendText: (text: string) => {
        const line = this.getLine(cursor[0]);
        if (!line) {
          console.warn("Line not found", cursor[0]);
          return;
        }
        if (line.text().trim().length === 0) {
          line.text(text);
          return;
        }
        const lineElement = this.getElementFromPos(line, cursor[1], false);
        if (!lineElement) {
          console.warn("Element not found", cursor[1]);
          return;
        }
        const additionalText = $(`<span></span>`).text(text);
        lineElement.append(additionalText);
      },
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
    pos: number,
    createMarker: boolean = true
  ): JQuery | null {
    const children = element.children();
    if (pos === 0) {
      return element;
    }
    if (children.length === 0) {
      if (this.completionMarker) {
        this.completionMarker.remove();
        this.completionMarker = null;
      }
      if (pos === element.text().length) {
        if (!createMarker) {
          return element;
        }
        this.completionMarker = $('<span id="completion-marker"></span>');
        element.append(this.completionMarker);
        return this.completionMarker;
      }
      if (!SUPPORT_COMPLETION_MARKER) {
        console.warn(
          "Completion marker is not supported",
          pos,
          element.text().length
        );
        return null;
      }
      const text = element.text();
      const beforeText = text.substring(0, pos);
      const afterText = text.substring(pos);
      const html = `${beforeText}<span id="completion-marker"></span>${afterText}`;
      element.html(html);
      this.completionMarker = $("#completion-marker");
      return this.completionMarker;
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
