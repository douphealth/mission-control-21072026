import type { UserSettings } from "./db";
import { stableBootstrapId } from "./bootstrapIdentity";

export type SeedPreference = NonNullable<UserSettings["bootstrapSeedPreference"]>;
export type SeedCollection = SeedPreference["collection"];

/** One cloud record per subject keeps independent removals from overwriting one another. */
export function seedPreferenceId(collection: SeedCollection, subject: string) {
  return stableBootstrapId("seed-preference-v1", JSON.stringify([collection, subject]));
}

export function seedPreferenceRecord(id: string, preference: SeedPreference): UserSettings {
  // UI preferences always read id="default". These typed metadata-only settings
  // rows travel through the existing per-record cloud sync without a DB migration.
  return {
    id,
    userName: "",
    userRole: "",
    theme: "system",
    sidebarCollapsed: false,
    dashboardLayout: [],
    bootstrapSeedPreference: preference,
  };
}
