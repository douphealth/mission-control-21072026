import type { AudienceAccount, AudienceReading } from "./db";
import { isRecentIso, isTrustedAudienceReading } from "./intelligenceQuality";

/** A series cannot join different providers, accounts or metric definitions. */
export function comparableAudienceReadings(left: AudienceReading, right: AudienceReading): boolean {
  const sameIdentity = left.providerAccountId || right.providerAccountId
    ? Boolean(left.providerAccountId && right.providerAccountId && left.providerAccountId === right.providerAccountId)
    : Boolean(left.verifiedHandle && right.verifiedHandle &&
        left.verifiedHandle.toLowerCase() === right.verifiedHandle.toLowerCase());
  return Boolean(
    isTrustedAudienceReading(left) && isTrustedAudienceReading(right) &&
    left.accountId === right.accountId && sameIdentity &&
    left.method === right.method && left.provider === right.provider &&
    left.metricSemantics && left.metricSemantics === right.metricSemantics &&
    Boolean(left.approximate) === Boolean(right.approximate),
  );
}

export function audienceMeasurementSummary(
  readings: AudienceReading[],
  account: Pick<AudienceAccount, "lastStatus">,
  now = Date.now(),
) {
  const valid = readings
    .filter(reading => isTrustedAudienceReading(reading) &&
      Number.isFinite(Date.parse(reading.capturedAt)) && Date.parse(reading.capturedAt) <= now + 5 * 60_000)
    .sort((a, b) => Date.parse(a.capturedAt) - Date.parse(b.capturedAt));
  const latest = valid.at(-1);
  const series = latest ? valid.filter(reading => comparableAudienceReadings(reading, latest)) : [];
  const previous = latest ? series.filter(reading => Date.parse(reading.capturedAt) < Date.parse(latest.capturedAt)).at(-1) : undefined;
  const current = Boolean(latest && account.lastStatus === "ok" && isRecentIso(latest.capturedAt, 1, now));
  const delta = latest && previous && latest.metricSemantics === "exact"
    ? (latest.followers as number) - (previous.followers as number)
    : null;
  return { latest, series, previous, current, delta };
}
