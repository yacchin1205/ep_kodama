import settings from "ep_etherpad-lite/node/utils/Settings";
import { ExpressCreateServerArgs } from "ep_etherpad-lite/hooks";
import { urlencoded } from "express";
import { CompletionQuery } from "./completion/base";
import { CompletionServiceWithCompaction } from "./completion/compaction";

const logPrefix = "[ep_kodama]";

async function completion(query: CompletionQuery): Promise<string> {
  const pluginSettings = settings.ep_kodama || {};
  if (pluginSettings.api === "openai") {
    const { OpenAICompletionService } = require("./completion/openai");
    const serviceCore = new OpenAICompletionService(pluginSettings);
    const service = new CompletionServiceWithCompaction(
      pluginSettings,
      serviceCore
    );
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
  app.get("/kodama/settings", (req, res) => {
    res.send({
      completion: settings.ep_kodama?.completion || {},
    });
  });
  app.post("/kodama/completion", urlencoded(), (req, res) => {
    const { query: queryString } = req.body;
    if (!queryString || typeof queryString !== "string") {
      res.status(400).send("query is required");
      return;
    }
    try {
      JSON.parse(queryString);
    } catch (err) {
      console.error(logPrefix, err, queryString);
      res.status(400).send("query must be a valid JSON");
      return;
    }
    const query = JSON.parse(queryString) as CompletionQuery;
    console.debug(logPrefix, "performing completion...", query);

    completion(query)
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
