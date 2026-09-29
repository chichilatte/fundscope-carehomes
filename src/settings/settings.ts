import { defaultUserSettings } from "../domain/defaults";
import type { PlaceId, UserSettings } from "../domain/types";

export const SETTINGS_STORAGE_KEY = "careHomeCashflow.settings";

/**
 * Bump this whenever the persisted `SelectedSettings` shape changes, and add a
 * migration step in `migrations.ts`.
 */
export const SETTINGS_SCHEMA_VERSION = 1;

/** Everything the user has chosen: jurisdiction, tax year, and personal figures. */
export interface SelectedSettings {
  placeId: PlaceId;
  taxYear: string;
  user: UserSettings;
}

export function defaultSelectedSettings(): SelectedSettings {
  return {
    placeId: "GB-SCT",
    taxYear: "2025/26",
    user: defaultUserSettings,
  };
}

// ---------------------------------------------------------------------------
// Structural validation (used after migration, before trusting stored data).
// ---------------------------------------------------------------------------

const PLACE_IDS: readonly PlaceId[] = ["GB-SCT", "GB-ENG", "GB-WLS", "GB-NIR"];

const NUMBER_FIELDS: readonly (keyof UserSettings)[] = [
  "careHomeFeePerWeek",
  "cashSavings",
  "homeValue",
  "incomePerYear",
  "weeksUntilFpcFncAwarded",
  "durationYears",
  "billingWeeks",
];

const BOOLEAN_FIELDS: readonly (keyof UserSettings)[] = ["nursingCareAwarded", "homeAcceptsStandardRate"];

const STRING_FIELDS: readonly (keyof UserSettings)[] = ["startDate"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isBoolean(value: unknown): value is boolean {
  return typeof value === "boolean";
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

export function parseUserSettings(value: unknown): UserSettings | null {
  if (!isRecord(value)) return null;
  for (const field of NUMBER_FIELDS) {
    if (!isFiniteNumber(value[field])) return null;
  }
  for (const field of BOOLEAN_FIELDS) {
    if (!isBoolean(value[field])) return null;
  }
  for (const field of STRING_FIELDS) {
    if (!isNonEmptyString(value[field])) return null;
  }
  return value as unknown as UserSettings;
}

export function parseSelectedSettings(value: unknown): SelectedSettings | null {
  if (!isRecord(value)) return null;
  if (!isNonEmptyString(value.placeId) || !PLACE_IDS.includes(value.placeId as PlaceId)) return null;
  if (!isNonEmptyString(value.taxYear)) return null;
  const user = parseUserSettings(value.user);
  if (!user) return null;
  return { placeId: value.placeId as PlaceId, taxYear: value.taxYear as string, user };
}
