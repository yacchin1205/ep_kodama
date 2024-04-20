import settings from "ep_etherpad-lite/node/utils/Settings";
import { ExpressCreateServerArgs } from "ep_etherpad-lite/hooks";

const logPrefix = "[ep_kodama]";

async function completion(query: string): Promise<string> {
  const pluginSettings = settings.ep_kodama || {};
  if (pluginSettings.api === "openai") {
    const { OpenAICompletionService } = require("./completion/openai");
    const service = new OpenAICompletionService(pluginSettings);
    return service.completion(query);
  }
  throw new Error(`Unknown API: ${pluginSettings.api}`);
}

exports.registerRoute = (
  hookName: any,
  args: ExpressCreateServerArgs,
  cb: (next: any) => void
) => {
  const { app } = args;
  app.get("/kodama/completion", (req, res) => {
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
