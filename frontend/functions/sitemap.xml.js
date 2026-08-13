import { proxyCatalogXml } from "../functions-shared/proxyCatalogXml.js";

export function onRequest(context) {
  return proxyCatalogXml(context, "/sitemap.xml");
}
