declare module "ep_etherpad-lite/node/utils/Settings" {
  export type APIModel = {
    default: string;
    forImage?: string;
  };

  export type CompactionSettings = {
    maxImageSize?: {
      width: number;
      height: number;
    };
    maxContentLength?: {
      beforeLength?: number;
      afterLength?: number;
    };
  };

  export type CompletionSettings = {
    previousSeparator?: string;
    waitSeconds?: number;
  };

  export const ep_kodama: {
    api?: string;
    apiKey?: string;
    apiModel?: APIModel | string;
    compaction?: CompactionSettings;
    completion?: CompletionSettings;
  };
}
