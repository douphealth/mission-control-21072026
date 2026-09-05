// ─── Validation ledger helpers ───────────────────────────────────────────────
// A change is not "done" until it is proven. This module owns the lifecycle:
// pending → validating → monitoring → passed / failed.

import { db, type Validation, type ValidationStatus } from "@/lib/db";
import { todayISO, addDaysLocal } from "@/lib/overdue";

export const OPEN_STATUSES: ValidationStatus[] = ["pending", "validating", "monitoring"];

export function isOpenValidation(v: Validation): boolean {
  return OPEN_STATUSES.includes(v.status);
}

/** Only things needing proof now, or very soon. Newest review date first. */
export function pendingValidations(all: Validation[], today = todayISO(), limit = 4): Validation[] {
  return all
    .filter((v) => v.status === "failed" || isOpenValidation(v))
    .sort((a, b) => {
      if (a.status === "failed" && b.status !== "failed") return -1;
      if (b.status === "failed" && a.status !== "failed") return 1;
      return (a.reviewAt || "9999").localeCompare(b.reviewAt || "9999");
    })
    .slice(0, limit);
}

export function isDueForReview(v: Validation, today = todayISO()): boolean {
  return !!v.reviewAt && v.reviewAt <= today && isOpenValidation(v);
}

export function statusLabel(v: Validation, today = todayISO()): string {
  switch (v.status) {
    case "pending":
      return "Waiting for validation";
    case "validating":
      return isDueForReview(v, today) ? "Ready to verify" : "Validating";
    case "monitoring":
      return isDueForReview(v, today) ? "Observation window closed" : "Monitoring";
    case "passed":
      return "Verified";
    default:
      return "Failed";
  }
}

export async function recordValidation(input: {
  title: string;
  entityId?: string;
  entityLabel?: string;
  actionId?: string;
  section?: string;
  successCriteria?: string;
  observationDays?: number;
  source?: string;
}): Promise<Validation> {
  const now = new Date().toISOString();
  const v: Validation = {
    id: `val_${now}_${Math.random().toString(36).slice(2, 8)}`,
    title: input.title,
    entityId: input.entityId,
    entityLabel: input.entityLabel,
    actionId: input.actionId,
    section: input.section,
    status: "validating",
    startedAt: now,
    reviewAt: addDaysLocal(todayISO(), input.observationDays ?? 7),
    successCriteria: input.successCriteria,
    source: input.source,
    createdAt: now,
    updatedAt: now,
  };
  await db.validations.put(v);
  return v;
}

export async function setValidationResult(
  id: string,
  status: ValidationStatus,
  result?: string,
): Promise<void> {
  const now = new Date().toISOString();
  await db.validations.update(id, {
    status,
    result,
    validatedAt: status === "passed" || status === "failed" ? now : undefined,
    updatedAt: now,
  });
}
