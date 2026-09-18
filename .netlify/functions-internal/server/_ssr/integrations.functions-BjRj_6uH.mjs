import { r as createServerFn } from "./server-BEODbGZS.mjs";
import { a as stringType, i as objectType } from "../_libs/zod.mjs";
import { y as createSsrRpc } from "./routes-qm6I9RAb.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/integrations.functions-BjRj_6uH.js
var getCloudflareZones = createServerFn({ method: "GET" }).handler(createSsrRpc("55a57477e5d182ec376ea00473f8aa6bff067cde139eeaed8cda7851b80ad793"));
var getVercelProjects = createServerFn({ method: "GET" }).handler(createSsrRpc("bb98a6f4ecc5b868002524cb465d4f809b43ff8ce78a0679cb44c97f80636ed1"));
/** Real reachability probe used by the service tracker — no manual "operational" claims. */
var probeEndpoint = createServerFn({ method: "POST" }).inputValidator((d) => objectType({ url: stringType().url() }).parse(d)).handler(createSsrRpc("f0ae3c4b18014f9bf6bd5895b5009e8f1c45602c9b296e516393bef8914d4799"));
//#endregion
export { getVercelProjects as n, probeEndpoint as r, getCloudflareZones as t };
