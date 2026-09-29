export interface MigrationStep {
  from: number;
  to: number;
  /** Takes the settings as stored under version `from`, returns version `to`. */
  up: (old: unknown) => unknown;
}

/**
 * Ordered migration steps. Schema v1 is the first version, so this list is
 * empty for now — append steps here whenever `SETTINGS_SCHEMA_VERSION` bumps.
 */
export const migrations: MigrationStep[] = [];

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
