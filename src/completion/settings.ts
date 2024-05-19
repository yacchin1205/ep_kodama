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

export type PluginSettings = {
  api?: string;
  apiKey?: string;
  apiModel?: APIModel | string;
  compaction?: CompactionSettings;
};
