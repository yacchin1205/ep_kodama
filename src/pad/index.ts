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
あなたは文章作成を支援するエージェントです。書き途中の文章を入力とし、書くべき適切な文章を提案します。
ユーザーが示すテキストのうち、<input (statement|lines) here> に設定すべきテキストとして適切な文字列を生成し、その文字列だけを返してください。
statementの場合は1文だけ、linesの場合は1〜3行の文を生成してください。なお、a.XXXは、文章の作成者を意味します。
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
