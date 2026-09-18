import { n as genId, t as db } from "./db-DLy-AV_e.mjs";
import { a as logAudit, o as markCloudRecordDirty, u as queueCloudPush } from "./useTableData-BUruD6H7.mjs";
import { l as todayISO, n as addDaysLocal } from "./overdue-CpArWbx3.mjs";
import { s as isRotten } from "./triage-Q9v9lxCb.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/decisions-BBH1QCp5.js
function normalizeFingerprintPart(part) {
	if (part == null) return "";
	return String(part).toLowerCase().replace(/https?:\/\//g, "").replace(/[\s_]+/g, " ").replace(/[^a-z0-9 ./:-]/g, "").trim();
}
/** Stable 32-bit FNV-1a hash, rendered as 8 hex chars. */
function fnv1a(input) {
	let hash = 2166136261;
	for (let i = 0; i < input.length; i++) {
		hash ^= input.charCodeAt(i);
		hash = Math.imul(hash, 16777619) >>> 0;
	}
	return hash.toString(16).padStart(8, "0");
}
/**
* Deterministic identity for a finding. Same inputs → same fingerprint on any
* device, in any order-independent scan.
*/
function fingerprint(kind, parts) {
	const body = parts.map(normalizeFingerprintPart).filter(Boolean).join("|");
	return `${normalizeFingerprintPart(kind) || "finding"}:${fnv1a(body)}`;
}
var SEVERITY_RANK = {
	low: 1,
	medium: 2,
	high: 3,
	critical: 4
};
/** A resolved finding stays quiet until its cooldown expires. */
function isSuppressed(record, now = /* @__PURE__ */ new Date()) {
	const ts = now.getTime();
	if (record.cooldownUntil && new Date(record.cooldownUntil).getTime() > ts) return true;
	if (record.status === "later" && record.deferUntil && (/* @__PURE__ */ new Date(`${record.deferUntil}T23:59:59`)).getTime() > ts) return true;
	return false;
}
/**
* A regression is a finding that comes back *after* it was resolved and its
* cooldown expired, or that comes back materially worse than when resolved.
*/
function isRegression(record, incomingSeverity, now = /* @__PURE__ */ new Date()) {
	if (!(record.status === "acted" || record.status === "ignored")) return false;
	if (!!incomingSeverity && SEVERITY_RANK[incomingSeverity] > SEVERITY_RANK[record.severity]) return true;
	return !isSuppressed(record, now);
}
function cooldownFrom(days, now = /* @__PURE__ */ new Date()) {
	return new Date(now.getTime() + days * 864e5).toISOString();
}
function nowISO() {
	return (/* @__PURE__ */ new Date()).toISOString();
}
async function persist(d) {
	await db.decisions.put(d);
	try {
		markCloudRecordDirty("decisions", d.id);
		queueCloudPush();
	} catch {}
}
/**
* Create or merge a finding into a decision.
*
* Identity is the fingerprint (`groupKey`), so the same underlying problem
* seen by ten scans stays exactly one decision. Resolved decisions stay quiet
* during their cooldown and only reopen as an explicit regression.
*/
async function upsertDecision(input) {
	const groupKey = input.groupKey ?? fingerprint(input.source, input.fingerprintParts ?? [input.title, input.websiteId]);
	const existing = await db.decisions.where("groupKey").equals(groupKey).first();
	if (existing) {
		if (isSuppressed(existing) && !isRegression(existing, input.severity)) {
			await persist({
				...existing,
				occurrences: existing.occurrences + 1,
				updatedAt: nowISO()
			});
			return existing.id;
		}
		const resolved = existing.status === "acted" || existing.status === "ignored";
		const regression = resolved && isRegression(existing, input.severity);
		if (resolved && !regression) {
			await persist({
				...existing,
				occurrences: existing.occurrences + 1,
				updatedAt: nowISO()
			});
			return existing.id;
		}
		const merged = {
			...existing,
			status: "open",
			occurrences: existing.occurrences + 1,
			regressions: (existing.regressions ?? 0) + (regression ? 1 : 0),
			context: input.context || existing.context,
			recommendation: input.recommendation ?? existing.recommendation,
			severity: input.severity ?? existing.severity,
			cooldownUntil: void 0,
			deferUntil: void 0,
			resolvedAt: void 0,
			updatedAt: nowISO()
		};
		await persist(merged);
		if (regression) await logAudit({
			action: "decision",
			collection: "decisions",
			recordId: merged.id,
			label: `Regression: ${merged.title}`,
			detail: `Seen again after being resolved (${merged.occurrences}x)`
		});
		return merged.id;
	}
	const d = {
		id: genId(),
		title: input.title,
		context: input.context,
		source: input.source,
		sourceRef: input.sourceRef,
		websiteId: input.websiteId,
		severity: input.severity ?? "medium",
		recommendation: input.recommendation,
		options: input.options,
		status: "open",
		groupKey,
		occurrences: 1,
		regressions: 0,
		cooldownDays: input.cooldownDays,
		createdAt: nowISO(),
		updatedAt: nowISO()
	};
	await persist(d);
	await logAudit({
		action: "decision",
		collection: "decisions",
		recordId: d.id,
		label: `New decision: ${d.title}`
	});
	return d.id;
}
/** Act: turns the decision into a real, dated, linked task. */
async function actOnDecision(decision, opts) {
	const due = addDaysLocal(todayISO(), opts?.dueInDays ?? 1);
	const task = {
		id: genId(),
		title: decision.recommendation?.slice(0, 140) || decision.title,
		priority: decision.severity,
		status: "todo",
		dueDate: due,
		category: decision.source,
		description: `${decision.context}\n\nFrom Decision Center (${decision.source}).`,
		linkedProject: decision.websiteId ?? "",
		subtasks: [],
		createdAt: nowISO(),
		touchedAt: todayISO()
	};
	await db.tasks.put(task);
	try {
		markCloudRecordDirty("tasks", task.id);
	} catch {}
	await persist({
		...decision,
		status: "acted",
		linkedTaskId: task.id,
		resolvedAt: nowISO(),
		cooldownUntil: cooldownFrom(decision.cooldownDays ?? 7),
		updatedAt: nowISO()
	});
	await logAudit({
		action: "decision",
		collection: "decisions",
		recordId: decision.id,
		label: `Acted: ${decision.title}`,
		detail: `Task created for ${due}`
	});
	return task.id;
}
async function ignoreDecision(decision, reason) {
	await persist({
		...decision,
		status: "ignored",
		resolutionNote: reason,
		resolvedAt: nowISO(),
		cooldownUntil: cooldownFrom(decision.cooldownDays ?? 30),
		updatedAt: nowISO()
	});
	await logAudit({
		action: "decision",
		collection: "decisions",
		recordId: decision.id,
		label: `Ignored: ${decision.title}`,
		detail: reason
	});
}
async function deferDecision(decision, days = 7) {
	const until = addDaysLocal(todayISO(), days);
	await persist({
		...decision,
		status: "later",
		deferUntil: until,
		updatedAt: nowISO()
	});
	await logAudit({
		action: "decision",
		collection: "decisions",
		recordId: decision.id,
		label: `Deferred: ${decision.title}`,
		detail: `Until ${until}`
	});
}
/** Deferred decisions come back on their date — nothing disappears quietly. */
async function reopenDueDecisions() {
	const today = todayISO();
	const due = (await db.decisions.where("status").equals("later").toArray()).filter((d) => (d.deferUntil ?? today) <= today);
	for (const d of due) await persist({
		...d,
		status: "open",
		updatedAt: nowISO()
	});
	return due.length;
}
async function generateDecisions(input) {
	let created = 0;
	const before = await db.decisions.count();
	for (const issue of input.seoIssues ?? []) {
		if (issue.status !== "open") continue;
		await upsertDecision({
			title: issue.title,
			context: `SEO ${issue.category} issue observed ${issue.observedAt.slice(0, 10)}${issue.url ? ` on ${issue.url}` : ""}.`,
			source: "seo",
			severity: issue.severity,
			websiteId: issue.websiteId,
			sourceRef: issue.id,
			groupKey: `seo|${issue.websiteId}|${issue.category}|${issue.title.toLowerCase().slice(0, 60)}`,
			recommendation: `Fix ${issue.category} issue: ${issue.title}`,
			options: [
				"Fix now",
				"Schedule for this week",
				"Accept as-is"
			]
		});
	}
	for (const m of (input.mentions ?? []).slice(0, 40)) {
		if (m.kind !== "mention" || m.status === "archived") continue;
		await upsertDecision({
			title: `Respond to mention: ${m.title.slice(0, 80)}`,
			context: `${m.source ?? "Web"} — ${m.url ?? ""}`,
			source: "mention",
			severity: "medium",
			sourceRef: m.id,
			groupKey: `mention|${m.url ?? m.id}`,
			recommendation: "Review the mention and decide whether to reply, amplify, or ignore.",
			options: [
				"Reply",
				"Amplify",
				"Ignore"
			]
		});
	}
	for (const t of (input.tasks ?? []).filter((x) => isRotten(x))) await upsertDecision({
		title: `Rotten task: ${t.title.slice(0, 80)}`,
		context: `Overdue since ${t.dueDate} and untouched. Keep it honest: re-commit, rewrite, or drop it.`,
		source: "task",
		severity: t.priority,
		sourceRef: t.id,
		groupKey: `task-rot|${t.id}`,
		recommendation: `Re-plan or drop "${t.title}"`,
		options: [
			"Re-schedule",
			"Break into smaller task",
			"Drop it"
		]
	});
	for (const h of input.health ?? []) {
		if (h.status !== "error") continue;
		await upsertDecision({
			title: `${h.label} is failing to sync`,
			context: h.error ?? "The last sync attempt failed.",
			source: "sync",
			severity: "high",
			sourceRef: h.id,
			groupKey: `sync|${h.id}`,
			recommendation: `Reconnect ${h.label} or stop relying on its data`,
			options: [
				"Reconnect",
				"Retry",
				"Disable source"
			]
		});
	}
	created = await db.decisions.count() - before;
	return created;
}
var SEVERITY_STYLE = {
	critical: "text-red-600 bg-red-500/10 border-red-500/20",
	high: "text-orange-600 bg-orange-500/10 border-orange-500/20",
	medium: "text-amber-600 bg-amber-500/10 border-amber-500/20",
	low: "text-muted-foreground bg-secondary/60 border-border/40"
};
//#endregion
export { ignoreDecision as a, generateDecisions as i, actOnDecision as n, reopenDueDecisions as o, deferDecision as r, upsertDecision as s, SEVERITY_STYLE as t };
