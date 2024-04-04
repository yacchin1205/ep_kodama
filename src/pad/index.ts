import OpenAI from "openai";

import { ExpressCreateServerArgs } from "ep_etherpad-lite/hooks";
import settings from "ep_etherpad-lite/node/utils/Settings";

import { PluginSettings } from "./settings";

const logPrefix = "[ep_kodama]";

async function completion(query: string): Promise<string> {
  const pluginSettings: PluginSettings = settings.ep_kodama || {};
  const openai = new OpenAI({
    apiKey: pluginSettings.apiKey,
  });
  const completion = await openai.chat.completions.create({
    model: pluginSettings.apiModel || "gpt-3.5-turbo",
    messages: [
      {
        role: "system",
        content: `
You are a writing assistance agent. You take as input a text in the process of being written and suggest appropriate words to be written.
The text contains a single marker <input (words|lines) here>. Follow the rules below to generate the string that should be placed there with consideration of the context before and after and return only that string.

- <input words here>: Generate a string that should be placed in this marker section. Include the part before the marker so that it becomes one sentence.
- <input lines here>: Generate about 1-3 sentences of lines that should be inserted in this marker section.

Note that a.XXX means the author of the statement.
`,
      },
      { role: "user", content: query.toString() },
    ],
  });
  const result = completion.choices[0].message.content;
  if (!result) {
    throw new Error("OpenAI response is empty");
  }
  console.log("OpenAI response:", result);
  return result;
}

exports.registerRoute = (
  hookName: any,
  args: ExpressCreateServerArgs,
  cb: (next: any) => void
) => {
  const { app } = args;
  app.get("/codama/completion", (req, res) => {
    const { query } = req.query;
    if (!query) {
      res.status(400).send("query is required");
      return;
    }
    console.log(logPrefix, "performing completion...", query);

    completion(query.toString())
      .then((result) => {
        res.send({
          query,
          result,
        });
      })
      .catch((err) => {
        console.error(logPrefix, err);
        res.status(500).send(err);
      });
  });
  cb(null);
};
