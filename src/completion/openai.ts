import OpenAI from "openai";

import { PluginSettings } from "./settings";
import {
  CompletionContent,
  CompletionContentType,
  CompletionQuery,
} from "./base";
import { ChatCompletionContentPart } from "openai/resources";
import { APIModel } from "ep_etherpad-lite/node/utils/Settings";

const logPrefix = "[ep_kodama]";

const DEFAULT_API_MODEL = "gpt-3.5-turbo";

function convertCompletionContent(
  content: CompletionContent
): ChatCompletionContentPart {
  switch (content.type) {
    case CompletionContentType.Text:
      return { type: "text", text: content.value };
    case CompletionContentType.Image:
      return {
        type: "image_url",
        image_url: {
          url: content.value,
          detail: "high",
        },
      };
    default:
      throw new Error(`Unsupported content type: ${content.type}`);
  }
}

function resolveAPIModel(
  apiModel: string | APIModel | undefined,
  needsImage: boolean
): {
  apiModelName: string;
  imageSupport: boolean;
} {
  if (apiModel === undefined) {
    return { apiModelName: DEFAULT_API_MODEL, imageSupport: false };
  }
  if (typeof apiModel === "string") {
    return {
      apiModelName: apiModel,
      imageSupport: false,
    };
  }
  if (needsImage && apiModel.forImage) {
    return {
      apiModelName: apiModel.forImage,
      imageSupport: true,
    };
  }
  return {
    apiModelName: apiModel.default,
    imageSupport: false,
  };
}

export class OpenAICompletionService {
  private pluginSettings: PluginSettings;

  constructor(pluginSettings: PluginSettings) {
    this.pluginSettings = pluginSettings;
  }

  async completion(query: CompletionQuery): Promise<string> {
    const openai = new OpenAI({
      apiKey: this.pluginSettings.apiKey,
    });
    const { apiModel } = this.pluginSettings;
    const imageIncludes = query.content.some(
      (c) => c.type === CompletionContentType.Image
    );
    const { apiModelName, imageSupport } = resolveAPIModel(
      apiModel,
      imageIncludes
    );
    if (imageIncludes && !imageSupport) {
      console.info(
        "Image support is not enabled for the current model. Ignore images.",
        apiModel
      );
    }
    console.debug(logPrefix, "OpenAI model:", apiModelName);
    console.debug(logPrefix, "Image support:", imageSupport);
    console.debug(logPrefix, "Query:", query);
    const completion = await openai.chat.completions.create({
      model: apiModelName,
      messages: [
        {
          role: "system",
          content: `
    You are a writing assistance agent. You take as input a text in the process of being written and suggest appropriate words to be written.
    The text contains a single marker <input (words|lines) here>. Follow the rules below to generate the string that should be placed there with consideration of the context before and after and return only that string.
    
    - <input words here>: Generate a string that should be placed in this marker section. Include the part before the marker so that it becomes one sentence.
    - <input lines here>: Generate about 1-3 sentences of lines that should be inserted in this marker section.
    
    Note that a.XXX means the author of the statement.
    If an image is attached as part of the input, please consider the content of that image in your suggestion.
    `,
        },
        {
          role: "user",
          content: query.content
            .filter(
              (c) =>
                c.type === CompletionContentType.Text ||
                (c.type === CompletionContentType.Image && imageSupport)
            )
            .map((c) => convertCompletionContent(c)),
        },
      ],
    });
    const result = completion.choices[0].message.content;
    if (!result) {
      throw new Error("OpenAI response is empty");
    }
    console.debug("OpenAI response:", result);
    return result;
  }
}
