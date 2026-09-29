import { addWeeksISO } from "../domain/dates";
import type { SimulationResult } from "../domain/types";
import { formatISODate } from "../format/dates";
import { formatGBP, formatGBPWhole } from "../format/money";

function weekLabel(week: number | null): string {
  return week === null ? "—" : String(week);
}

function dateLabel(startDate: string, week: number | null): string {
  if (week === null) return "never";
  return formatISODate(addWeeksISO(startDate, week - 1));
}

export function renderResults(root: HTMLElement, result: SimulationResult, startDate: string): void {
  const m = result.milestones;
  const councilRows =
    result.standardRate > 0
      ? `<div class="milestone"><dt>Council standard rate</dt><dd>${formatGBP(result.standardRate)}</dd></div>
      <div class="milestone"><dt>Top-up per week</dt><dd>${formatGBP(result.topUp)}</dd></div>`
      : "";
  root.innerHTML = `
    <h2>Summary</h2>
    <dl class="milestones">
      <div class="milestone"><dt>Weekly income</dt><dd>${formatGBP(result.income)}</dd></div>
      ${councilRows}
      <div class="milestone"><dt>Cash runs out → sell house</dt><dd>week ${weekLabel(m.cashOutWeek)} · ${dateLabel(startDate, m.cashOutWeek)}</dd></div>
      <div class="milestone"><dt>Means-test review</dt><dd>week ${weekLabel(m.meansTestWeek)} · ${dateLabel(startDate, m.meansTestWeek)}</dd></div>
      <div class="milestone"><dt>Council takes over</dt><dd>week ${weekLabel(m.councilTakeoverWeek)} · ${dateLabel(startDate, m.councilTakeoverWeek)}</dd></div>
      <div class="milestone"><dt>Lower limit reached</dt><dd>${m.lowerLimitWeek === null ? "never" : `week ${m.lowerLimitWeek}`}</dd></div>
      <div class="milestone"><dt>Minimum capital</dt><dd>${formatGBPWhole(result.minCapital)} (week ${result.minCapitalWeek})</dd></div>
      <div class="milestone"><dt>Capital at end</dt><dd>${formatGBPWhole(result.finalCapital)}</dd></div>
    </dl>
  `;
}
