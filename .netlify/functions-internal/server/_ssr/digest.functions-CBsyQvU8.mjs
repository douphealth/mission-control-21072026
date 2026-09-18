import { r as createServerFn } from "./server-BEODbGZS.mjs";
import { a as stringType, i as objectType, r as numberType, t as arrayType } from "../_libs/zod.mjs";
import { t as createServerRpc } from "./createServerRpc-BUblNgf4.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/digest.functions-CBsyQvU8.js
var taskSchema = objectType({
	title: stringType().max(300),
	priority: stringType().max(30).optional(),
	dueDate: stringType().max(20).optional(),
	startTime: stringType().max(10).optional(),
	daysOverdue: numberType().optional()
});
var digestSchema = objectType({
	date: stringType().max(20),
	overdue: arrayType(taskSchema).max(200),
	dueToday: arrayType(taskSchema).max(200),
	dueTomorrow: arrayType(taskSchema).max(200),
	completedToday: numberType()
});
/**
* Sends the daily overdue digest. The recipient is fixed by the template
* (account owner) — the browser can never choose a recipient or template.
*/
var sendOverdueDigest_createServerFn_handler = createServerRpc({
	id: "d7d1718120be17eb85dbaa89181b79e2a884da990a2bb1141d11ac01efd0a9c4",
	name: "sendOverdueDigest",
	filename: "src/lib/digest.functions.ts"
}, (opts) => sendOverdueDigest.__executeServer(opts));
var sendOverdueDigest = createServerFn({ method: "POST" }).inputValidator((data) => digestSchema.parse(data)).handler(sendOverdueDigest_createServerFn_handler, async ({ data }) => {
	const { sendTemplateEmail } = await import("./send-email-FVJL45-y.mjs");
	return await sendTemplateEmail("overdue-digest", "", {
		templateData: data,
		idempotencyKey: `overdue-digest-${data.date}-${data.overdue.length}-${data.dueToday.length}`
	});
});
//#endregion
export { sendOverdueDigest_createServerFn_handler };
