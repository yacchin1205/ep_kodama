declare module "ep_etherpad-lite/node/utils/Settings" {
  export type APIModel = {
    default: string;
    forImage?: string;
  }

  export const ep_kodama: {
    api?: string;
    apiKey?: string;
    apiModel?: APIModel | string;
  };
}
