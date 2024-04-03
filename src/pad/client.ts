import { EejsBlockContext } from "ep_etherpad-lite/hooks";
import eejs from "ep_etherpad-lite/node/eejs";

exports.eejsBlock_styles = (hookName: any, context: EejsBlockContext) => {
  context.content += eejs.require("./templates/styles.html", {}, module);
};
