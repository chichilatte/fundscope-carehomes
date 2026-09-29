import { firstOfNextMonthIso } from "../domain/dates";
import type { PlaceId } from "../domain/types";
import { getPlace, places } from "../settings/places";
import { defaultSelectedSettings, type SelectedSettings } from "../settings/settings";
import { query } from "./dom";

type WaInput = HTMLElement & { value: string };
type WaSelect = HTMLElement & { value: string };
type WaCheckbox = HTMLElement & { checked: boolean };

export interface SettingsForm {
  getSettings(): SelectedSettings;
  onChange(cb: () => void): void;
}

function optionList(items: { value: string; label: string }[]): string {
  return items.map((i) => `<wa-option value="${i.value}">${i.label}</wa-option>`).join("");
}

export function buildSettingsForm(root: HTMLElement, initial: SelectedSettings): SettingsForm {
  const placeSelect = query<WaSelect>(root, "#place");
  const taxYearSelect = query<WaSelect>(root, "#taxYear");

  const fee = query<WaInput>(root, "#fee");
  const cash = query<WaInput>(root, "#cash");
  const home = query<WaInput>(root, "#home");
  const income = query<WaInput>(root, "#income");
  const delay = query<WaInput>(root, "#delay");
  const duration = query<WaInput>(root, "#duration");
  const billing = query<WaInput>(root, "#billing");
  const startDate = query<WaInput>(root, "#startDate");
  const nursing = query<WaCheckbox>(root, "#nursing");
  const acceptsStd = query<WaCheckbox>(root, "#acceptsStd");
  const resetBtn = query<HTMLElement>(root, "#reset");

  placeSelect.innerHTML = optionList(places.map((p) => ({ value: p.id, label: p.name })));

  // Keep the selection in plain JS rather than reading `<wa-select>.value`
  // synchronously: the component only reports a value once its `<wa-option>`
  // children are registered, which happens in a deferred slot-change microtask.
  let placeId: PlaceId = initial.placeId;
  let taxYear: string = initial.taxYear;

  function syncStandardRate(): void {
    acceptsStd.style.display = getPlace(placeId)?.hasStandardRate ? "" : "none";
  }

  function syncTaxYears(): void {
    const place = getPlace(placeId);
    const years = place?.taxYears ?? [];
    const previous = taxYear;
    taxYearSelect.innerHTML = optionList(years.map((t) => ({ value: t.year, label: t.year })));
    taxYear =
      years.length === 0
        ? ""
        : years.some((t) => t.year === previous)
          ? previous
          : (years[years.length - 1]?.year ?? "");
    taxYearSelect.value = taxYear;
    syncStandardRate();
  }

  function setSettings(s: SelectedSettings): void {
    placeId = s.placeId;
    taxYear = s.taxYear;
    placeSelect.value = s.placeId;
    syncTaxYears();
    fee.value = String(s.user.careHomeFeePerWeek);
    cash.value = String(s.user.cashSavings);
    home.value = String(s.user.homeValue);
    income.value = String(s.user.incomePerYear);
    delay.value = String(s.user.weeksUntilFpcFncAwarded);
    duration.value = String(s.user.durationYears);
    billing.value = String(s.user.billingWeeks);
    startDate.value = s.user.startDate;
    nursing.checked = s.user.nursingCareAwarded;
    acceptsStd.checked = s.user.homeAcceptsStandardRate;
  }

  function num(input: WaInput, fallback: number): number {
    const n = Number(input.value);
    return Number.isFinite(n) ? n : fallback;
  }

  function getSettings(): SelectedSettings {
    return {
      placeId,
      taxYear,
      user: {
        careHomeFeePerWeek: num(fee, 0),
        cashSavings: num(cash, 0),
        homeValue: num(home, 0),
        incomePerYear: num(income, 0),
        weeksUntilFpcFncAwarded: num(delay, 0),
        durationYears: num(duration, 5),
        billingWeeks: num(billing, 4),
        startDate: startDate.value || firstOfNextMonthIso(),
        nursingCareAwarded: nursing.checked,
        homeAcceptsStandardRate: acceptsStd.checked,
      },
    };
  }

  setSettings(initial);

  let handler: (() => void) | null = null;
  const trigger = (): void => handler?.();

  placeSelect.addEventListener("change", () => {
    placeId = placeSelect.value as PlaceId;
    syncTaxYears();
    trigger();
  });

  taxYearSelect.addEventListener("change", () => {
    taxYear = taxYearSelect.value;
    trigger();
  });

  const reactive = [
    fee,
    cash,
    home,
    income,
    delay,
    duration,
    billing,
    startDate,
    nursing,
    acceptsStd,
  ];
  for (const el of reactive) {
    el.addEventListener("change", trigger);
    el.addEventListener("input", trigger);
  }

  resetBtn.addEventListener("click", () => {
    setSettings(defaultSelectedSettings());
    trigger();
  });

  return {
    getSettings,
    onChange(cb) {
      handler = cb;
    },
  };
}
