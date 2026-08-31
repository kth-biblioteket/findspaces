import * as XLSX from "xlsx";
import { getSpaceValues, type FilterCategoryRow, type FilterOption, type Space } from "./spaces";

function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const yn = (v: boolean | null | undefined) => (v ? "Ja" : "Nej");
const num = (v: number | null | undefined) => (v === null || v === undefined ? "" : v);
const txt = (v: string | null | undefined) => v ?? "";

/** Translate stored values (value_key or label) to readable labels. */
function labelsFor(values: string[], options: FilterOption[], lang: "sv" | "en"): string {
  return values
    .map((v) => {
      const opt = options.find((o) => o.value_key === v || o.label === v || o.label_en === v);
      if (!opt) return v;
      return lang === "en" ? (opt.label_en || opt.label) : opt.label;
    })
    .join(", ");
}

export function exportSpacesToExcel(
  spaces: Space[],
  categories: FilterCategoryRow[],
  byKey: Record<string, FilterOption[]>,
): void {
  const wb = XLSX.utils.book_new();
  const cats = [...categories].sort((a, b) => a.sort_order - b.sort_order);

  // Sheet 1: Lokaler — one row per space, one column per filter category.
  const header = [
    "Namn (SV)", "Name (EN)", "Slug", "ID", "Kategori (space_kind)", "Sorteringsordning", "Dold",
    "Våningsplan (SV)", "Floor (EN)", "Ligger i (SV)", "Located in (EN)",
    "Antal studieplatser", "Antal datorplatser", "Antal nedslagsplatser", "Rumsnummer bokning",
    "Beskrivning (SV)", "Description (EN)", "Beskrivning direkt på kortet",
    "Info (SV)", "Info (EN)", "Driftsmeddelande (SV)", "Notice (EN)",
    "Kartlänk (SV)", "Kartlänk (EN)", "Bokningslänk (SV)", "Bokningslänk (EN)",
    "Grupprumslänk (SV)", "Grupprumslänk (EN)", "Grupprumsetikett (SV)", "Grupprumsetikett (EN)",
    "Boka nu-länk (SV)", "Boka nu-länk (EN)", "Datorlänk",
    "Visa beläggning", "Sensor-ID (CountMatters)", "Antal bilder",
    ...cats.map((c) => `Filter: ${c.title}`),
    "Skapad", "Uppdaterad",
  ];

  const rows: (string | number)[][] = [header];
  for (const s of spaces) {
    rows.push([
      txt(s.name), txt(s.name_en), txt(s.slug), s.id, txt(s.space_kind), num(s.sort_order), yn(s.hidden),
      txt(s.floor), txt(s.floor_en), txt(s.located_in), txt(s.located_in_en),
      num(s.capacity), num(s.computer_count), num(s.informal_seat_count), num(s.booking_room_number),
      txt(s.description), txt(s.description_en), yn(s.description_inline),
      txt(s.info), txt(s.info_en), txt(s.notice), txt(s.notice_en),
      txt(s.map_url), txt(s.map_url_en), txt(s.booking_url), txt(s.booking_url_en),
      txt(s.group_booking_url), txt(s.group_booking_url_en), txt(s.group_booking_label), txt(s.group_booking_label_en),
      txt(s.book_now_url), txt(s.book_now_url_en), txt((s as unknown as { computers_url?: string }).computers_url),
      yn(s.show_occupancy), txt(s.countmatters_sensor_id), (s.images ?? []).length,
      ...cats.map((c) => labelsFor(getSpaceValues(s, c.key), byKey[c.key] ?? [], "sv")),
      txt((s as unknown as { created_at?: string }).created_at),
      txt((s as unknown as { updated_at?: string }).updated_at),
    ]);
  }
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!cols"] = header.map((h) => ({ wch: Math.min(40, Math.max(12, h.length + 2)) }));
  XLSX.utils.book_append_sheet(wb, ws, "Lokaler");

  // Sheet 2: Bilder & alttexter
  const imgRows: (string | number)[][] = [["Lokal (SV)", "Bild nr", "Bildfil/URL", "Alt-text (SV)", "Alt text (EN)"]];
  for (const s of spaces) {
    const imgs = s.images ?? [];
    if (imgs.length === 0) {
      imgRows.push([txt(s.name), "", "(inga bilder)", "", ""]);
      continue;
    }
    imgs.forEach((url, i) => {
      imgRows.push([txt(s.name), i + 1, url, txt(s.image_alts?.[i]), txt(s.image_alts_en?.[i])]);
    });
  }
  const wsImg = XLSX.utils.aoa_to_sheet(imgRows);
  wsImg["!cols"] = [{ wch: 30 }, { wch: 8 }, { wch: 60 }, { wch: 45 }, { wch: 45 }];
  XLSX.utils.book_append_sheet(wb, wsImg, "Bilder & alttexter");

  // Sheet 3: Filter per lokal (long format, en rad per valt filter)
  const fRows: (string | number)[][] = [["Lokal (SV)", "Kategori", "Filter (SV)", "Filter (EN)"]];
  for (const s of spaces) {
    for (const c of cats) {
      const opts = byKey[c.key] ?? [];
      for (const v of getSpaceValues(s, c.key)) {
        fRows.push([txt(s.name), c.title, labelsFor([v], opts, "sv"), labelsFor([v], opts, "en")]);
      }
    }
  }
  const wsF = XLSX.utils.aoa_to_sheet(fRows);
  wsF["!cols"] = [{ wch: 30 }, { wch: 24 }, { wch: 28 }, { wch: 28 }];
  XLSX.utils.book_append_sheet(wb, wsF, "Filter per lokal");

  XLSX.writeFile(wb, `lokaler_export_${today()}.xlsx`);
}
