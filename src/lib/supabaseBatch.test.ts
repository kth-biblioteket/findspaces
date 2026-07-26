import { describe, expect, it } from "vitest";
import { errorMessage, runSupabaseBatch } from "@/lib/supabaseBatch";

describe("runSupabaseBatch", () => {
  it("returns all results when every operation succeeds", async () => {
    await expect(
      runSupabaseBatch([
        Promise.resolve({ error: null, data: 1 }),
        Promise.resolve({ error: null, data: 2 }),
      ]),
    ).resolves.toHaveLength(2);
  });

  it("throws when Supabase resolves an operation with an error", async () => {
    await expect(
      runSupabaseBatch([
        Promise.resolve({ error: null }),
        Promise.resolve({ error: { message: "RLS denied the update" } }),
      ]),
    ).rejects.toThrow("RLS denied the update");
  });

  it("extracts useful messages from unknown errors", () => {
    expect(errorMessage({ message: "Databasfel" })).toBe("Databasfel");
    expect(errorMessage(null, "Reservtext")).toBe("Reservtext");
  });
});
