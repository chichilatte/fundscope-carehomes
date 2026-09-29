import templateUrl from "./template.xlsx?url";

/** Load the workbook template (a bundled asset) as raw bytes. */
export async function loadTemplate(): Promise<ArrayBuffer> {
  const response = await fetch(templateUrl);
  if (!response.ok) {
    throw new Error(`Failed to load workbook template (HTTP ${response.status})`);
  }
  return response.arrayBuffer();
}
