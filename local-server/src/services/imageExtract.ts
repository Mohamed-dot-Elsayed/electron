import { getImageFieldsForTable } from "../db/imageFields";

// row here is the raw object from the server response — BEFORE insertRow's
// JSON.stringify pass, so arrays are still real arrays.
export function extractImageUrls(table: string, row: Record<string, any>): string[] {
  const fields = getImageFieldsForTable(table);
  if (!fields.length) return [];

  const urls: string[] = [];

  for (const { field, type } of fields) {
    const value = row[field];
    if (value === undefined || value === null) continue;

    if (type === "single") {
      if (typeof value === "string" && value.trim()) urls.push(value);
      continue;
    }

    // array/gallery — tolerate it arriving pre-stringified too
    let arr = value;
    if (typeof arr === "string") {
      try { arr = JSON.parse(arr); } catch { arr = []; }
    }
    if (Array.isArray(arr)) {
      for (const item of arr) {
        if (typeof item === "string" && item.trim()) urls.push(item);
      }
    }
  }

  return urls;
}