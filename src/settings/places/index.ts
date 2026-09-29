import type { Place, PlaceId, TaxYearRates } from "../../domain/types";
import { gbEng } from "./gb-eng.place";
import { gbNir } from "./gb-nir.place";
import { gbSct } from "./gb-sct.place";
import { gbWls } from "./gb-wls.place";

/** All registered jurisdictions, in display order. */
export const places: Place[] = [gbSct, gbEng, gbWls, gbNir];

const byId = new Map<PlaceId, Place>(places.map((p) => [p.id, p]));

export function getPlace(id: PlaceId): Place | undefined {
  return byId.get(id);
}

/** The latest tax year for a place (the last entry is treated as most recent). */
export function getLatestTaxYear(place: Place): TaxYearRates | undefined {
  return place.taxYears[place.taxYears.length - 1];
}

export function getTaxYear(place: Place, year: string): TaxYearRates | undefined {
  return place.taxYears.find((t) => t.year === year);
}

/** Resolve the rates for a selected tax-year label, falling back to the latest available. */
export function resolveRates(place: Place, taxYear: string): TaxYearRates | undefined {
  return getTaxYear(place, taxYear) ?? getLatestTaxYear(place);
}
