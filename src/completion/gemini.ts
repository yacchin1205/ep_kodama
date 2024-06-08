import { GoogleGenerativeAI } from "@google/generative-ai";
import { PluginSettings } from "./settings";
import {
  CompletionContent,
  CompletionContentType,
  CompletionQuery,
} from "./base";
import { APIModel } from "ep_etherpad-lite/node/utils/Settings";

const logPrefix = "[ep_kodama]";

type GenAIPrompt =
  | string
  | {
      inlineData: {
        data: string;
        mimeType: string;
      };
    };

function convertCompletionContent(content: CompletionContent): GenAIPrompt {
  switch (content.type) {
    case CompletionContentType.Text:
      return content.value;
    case CompletionContentType.Image:
      // if the content is not a data URL, return it as is
      if (!content.value.startsWith("data:")) {
        return content.value;
      }
      // if the content is a data URL, extract the data and mimeType
      const dataURL = content.value;
      const buffer = Buffer.from(dataURL.split(",")[1], "base64");
      const mimeType = dataURL.split(",")[0].split(":")[1].split(";")[0];
      return {
        inlineData: {
          data: buffer.toString("base64"),
          mimeType,
        },
      };
    default:
      throw new Error(`Unsupported content type: ${content.type}`);
  }
}

export class GeminiCompletionService {
  private pluginSettings: PluginSettings;

  constructor(pluginSettings: PluginSettings) {
    this.pluginSettings = pluginSettings;
  }

  async completion(query: CompletionQuery): Promise<string> {
    if (this.pluginSettings.apiKey === undefined) {
      throw new Error("API key is required");
    }
    const genAI = new GoogleGenerativeAI(this.pluginSettings.apiKey);
    const { apiModel } = this.pluginSettings;
    if (apiModel === undefined) {
      throw new Error("API model is required");
    }
    if (typeof apiModel !== "string") {
      throw new Error("API model must be a string");
    }
    const model = genAI.getGenerativeModel({
      model: apiModel,
    });

    console.debug(logPrefix, "Gemini model:", apiModel);
    console.debug(logPrefix, "Query:", query);
    const prompt = `
    You are a writing assistance agent. You take as input a text in the process of being written and suggest appropriate words to be written.
    The text contains a single marker <input (words|lines) here>. Follow the rules below to generate the string that should be placed there with consideration of the context before and after and return only that string.
    
    - <input words here>: Generate a string that should be placed in this marker. Generate text that makes sense together with the preceding text and the text in the marker to make a single sentence.
    - <input lines here>: Generate about 1-3 sentences of lines that should be inserted in this marker.
    
    Note that a.XXX means the author of the statement.
    The language should be selected appropriately for the text entered.
    If an image is attached as part of the input, please consider the content of that image in your suggestion.
    The result text should not include any preceding or following text, and should not be highlighted in Markdown.
    `;

    const result = await model.generateContent(
      [prompt as GenAIPrompt].concat(
        query.content.map((c) => convertCompletionContent(c))
      )
    );
    const text = result.response.text();
    console.debug("Gemini response:", text);
    return text;
  }
}
