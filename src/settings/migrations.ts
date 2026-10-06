export interface MigrationStep {
  from: number;
  to: number;
  /** Takes the settings as stored under version `from`, returns version `to`. */
  up: (old: unknown) => unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/**
 * Ordered migration steps. Append a step here whenever `SETTINGS_SCHEMA_VERSION`
 * bumps, carrying stored settings forward field-by-field.
 */
export const migrations: MigrationStep[] = [
  {
    from: 1,
    to: 2,
    up: (old) => {
      const settings = isRecord(old) ? old : {};
      const user = isRecord(settings.user) ? settings.user : {};
      return { ...settings, user: { ...user, prepayWeeks: 2, depositWeeks: 2 } };
    },
  },
];

/** Walk `value` from `from` to `to` applying any registered steps. */
export function migrate(value: unknown, from: number, to: number, steps: MigrationStep[]): unknown {
  if (from === to) return value;

  let current = value;
  let version = from;
  const byFrom = new Map(steps.map((s) => [s.from, s]));

  while (version < to) {
    const step = byFrom.get(version);
    if (!step) {
      throw new Error(`No migration step from schema version ${version}`);
    }
    current = step.up(current);
    version = step.to;
  }

  if (version !== to) {
    throw new Error(`Migration path ended at version ${version}, expected ${to}`);
  }
  return current;
}
