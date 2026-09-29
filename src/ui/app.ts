import { buildChartOption } from "../chart/chartData";
import { createChartRenderer, type ChartRenderer } from "../chart/renderer";
import { simulate } from "../domain/engine";
import type { Place, SimulationResult, TaxYearRates, UserSettings } from "../domain/types";
import { buildWorkbook } from "../export/xlsx/build";
import { downloadBlob } from "../export/xlsx/download";
import { loadTemplate } from "../export/xlsx/template";
import { getPlace, resolveRates } from "../settings/places";
import { loadSettings, saveSettings } from "../settings/repository";
import { localStorageAdapter } from "../settings/storage";
import { buildShareUrl, parseShareUrl } from "../settings/url";
import { initCredits } from "./credits";
import { query } from "./dom";
import { buildSettingsForm } from "./form";
import { renderJurisdictionNote } from "./notes";
import { renderResults } from "./results";

export function init(root: HTMLElement): void {
  const storage = localStorageAdapter;
  const initial = parseShareUrl(window.location.search) ?? loadSettings(storage).settings;

  const form = buildSettingsForm(query(root, "#settings-form"), initial);
  const resultsRoot = query(root, "#results");
  const exportBtn = query<HTMLElement & { disabled: boolean }>(root, "#export");
  const shareBtn = query(root, "#share");
  const shareLabel = query(root, "#share-label");
  initCredits(root);

  let last: { place: Place; rates: TaxYearRates; user: UserSettings; result: SimulationResult } | null = null;
  let chart: ChartRenderer | null = null;

  function run(persist = true): void {
    const selection = form.getSettings();
    if (persist) saveSettings(storage, selection);

    const place = getPlace(selection.placeId);
    const rates = place ? resolveRates(place, selection.taxYear) : undefined;
    if (!place || !rates) {
      resultsRoot.innerHTML = `<p class="muted">This place has no tax-year data yet.</p>`;
      chart?.clear();
      last = null;
      exportBtn.disabled = true;
      return;
    }

    renderJurisdictionNote(root, rates);
    const result = simulate(place, rates, selection.user);
    last = { place, rates, user: selection.user, result };
    exportBtn.disabled = false;
    renderResults(resultsRoot, result, selection.user.startDate);
    chart?.setOption(
      buildChartOption(result, {
        startDate: selection.user.startDate,
        upperLimit: rates.upperCapitalLimit,
        lowerLimit: rates.lowerCapitalLimit,
        meansTestThreshold: rates.meansTestThreshold,
      }),
    );
  }

  shareBtn.addEventListener("click", () => {
    const url = buildShareUrl(form.getSettings(), window.location.href);
    void (async () => {
      try {
        await navigator.clipboard.writeText(url);
        shareLabel.textContent = "Copied!";
        window.setTimeout(() => {
          shareLabel.textContent = "Share";
        }, 2000);
      } catch {
        // Clipboard unavailable (e.g. non-secure context) — leave as-is.
      }
    })();
  });

  exportBtn.addEventListener("click", () => {
    const current = last;
    if (!current) return;
    exportBtn.disabled = true;
    void (async () => {
      try {
        const template = await loadTemplate();
        const blob = await buildWorkbook(
          { place: current.place, rates: current.rates, user: current.user, result: current.result },
          template,
        );
        downloadBlob(blob, "care-home-cashflow.xlsx");
      } catch (err) {
        console.error("Export failed", err);
      } finally {
        exportBtn.disabled = false;
      }
    })();
  });

  form.onChange(run);

  // The chart card is a `<wa-card>` custom element; its slot isn't rendered
  // until the component's first update, so `#chart` has zero size right now.
  // Defer chart creation until the card has painted, then keep it in sync with
  // the container via a ResizeObserver.
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      const container = query(root, "#chart");
      chart = createChartRenderer(container);
      new ResizeObserver(() => chart?.resize()).observe(container);
      run(false);
    });
  });
}
