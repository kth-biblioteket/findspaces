import { z } from "zod";

/**
 * Validation for the admin space form. The form keeps everything as strings,
 * so the schema checks the raw input and produces friendly Swedish messages
 * before anything is written to the database.
 */
const optionalInt = (field: string, max = 10_000) =>
  z
    .string()
    .trim()
    .refine((v) => v === "" || /^\d+$/.test(v), `${field}: ange ett heltal (endast siffror).`)
    .refine((v) => v === "" || Number(v) <= max, `${field}: värdet verkar orimligt högt.`);

const optionalUrl = (field: string) =>
  z
    .string()
    .trim()
    .refine(
      (v) => v === "" || /^(https?:\/\/|\/)/i.test(v),
      `${field}: länken måste börja med https:// (eller / för en intern länk).`,
    )
    .refine((v) => v.length <= 2000, `${field}: länken är för lång.`);

export const spaceFormSchema = z.object({
  name: z.string().trim().min(1, "Namn (SV) måste fyllas i.").max(200, "Namn (SV) är för långt."),
  name_en: z.string().trim().max(200, "Name (EN) är för långt."),
  slug: z
    .string()
    .trim()
    .refine(
      (v) => v === "" || /^[a-z0-9-]+$/i.test(v),
      "Slug: använd endast bokstäver a–z, siffror och bindestreck.",
    )
    .refine((v) => v.length <= 100, "Slug är för lång."),
  space_kind: z.string().trim().min(1, "Kategori måste väljas."),
  capacity: optionalInt("Antal studieplatser"),
  computer_count: optionalInt("Antal datorplatser"),
  informal_seat_count: optionalInt("Antal nedslagsplatser"),
  booking_room_number: optionalInt("Rumsnummer för bokning", 999_999),
  map_url: optionalUrl("Kartlänk (SV)"),
  map_url_en: optionalUrl("Kartlänk (EN)"),
  booking_url: optionalUrl("Bokningslänk (SV)"),
  booking_url_en: optionalUrl("Bokningslänk (EN)"),
  group_booking_url: optionalUrl("Grupprumslänk (SV)"),
  group_booking_url_en: optionalUrl("Grupprumslänk (EN)"),
  book_now_url: optionalUrl("Boka nu-länk (SV)"),
  book_now_url_en: optionalUrl("Boka nu-länk (EN)"),
});

export type SpaceFormInput = z.input<typeof spaceFormSchema>;

/** Returns a list of human-readable problems, empty when the form is valid. */
export function validateSpaceForm(form: Record<string, unknown>): string[] {
  const result = spaceFormSchema.safeParse(form);
  if (result.success) return [];
  return [...new Set(result.error.issues.map((issue) => issue.message))];
}
