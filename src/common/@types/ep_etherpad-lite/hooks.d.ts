declare module "ep_etherpad-lite/hooks" {
  import { Request, Response, Express } from "express";
  import { PadType } from "ep_search/setup";

  export type AceEditor = {
    callWithAce: (
      fn: (ace: AceEditorInfo) => void,
      callstack: string,
      arg3: boolean
    ) => void;
  };

  export type AceEditorInfo = {
    editor: AceEditor;
    ace_setOnKeyPress?: (handler: (event: any) => void) => void;
    ace_setOnKeyDown?: (handler: (event: any) => void) => void;
    ace_performSelectionChange?: (
      selStart: number[],
      selEnd: number[],
      arg3: boolean
    ) => void;
  };

  export type Pad = PadType & {
    getPadId: () => string;
  };

  export type AceToolbar = {
    registerCommand: (command: string, handler: () => void) => void;
    toggleDropDown: (command: string) => void;
  };

  export type DocumentAttributeManager = {
    author?: string;
  };

  export type Rep = {
    alines?: (string | undefined)[];
    alltext: string;
    selStart?: number[];
    selEnd?: number[];
    selFocusAtStart?: boolean;
    apool?: {
      numToAttrib?: { [num: number]: string[] };
      attribToNum?: { [attrib: string]: number };
    };
  };

  export type ClientVars = {
    ep_kodama: {};
  };

  export type EejsBlockContext = {
    content: string;
  };

  export type PreAuthorizeArgs = {
    req: Request;
  };

  export type ExpressCreateServerArgs = {
    app: Express;
  };

  export type AceEditEventContext = {
    editorInfo: AceEditorInfo;
    rep: Rep;
    documentAttributeManager: DocumentAttributeManager;
  };

  export type PostAceInitContext = {
    ace: AceEditor;
    pad: Pad;
    clientVars: ClientVars;
  };

  export type PostToolbarInit = {
    toolbar: AceToolbar;
  };

  export type AceGetFilterStackContext = {
    linestylefilter: {
      getRegexpFilter: (pattern: RegExp, tag: string) => any;
    };
  };
}
