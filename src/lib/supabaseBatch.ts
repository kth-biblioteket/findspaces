export type SupabaseErrorLike = {
  message: string;
};

export type SupabaseResultLike = {
  error: SupabaseErrorLike | null;
};

export function errorMessage(error: unknown, fallback = "Ett oväntat fel inträffade"): string {
  if (error instanceof Error && error.message) return error.message;
  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof error.message === "string" &&
    error.message
  ) {
    return error.message;
  }
  return fallback;
}

/**
 * Supabase query builders are PromiseLike and resolve to `{ error }` for many
 * database failures. Promise.all alone therefore does not reject.
 */
export async function runSupabaseBatch<T extends SupabaseResultLike>(
  operations: ReadonlyArray<PromiseLike<T>>,
): Promise<T[]> {
  const results = await Promise.all(operations);
  const failed = results.find((result) => result.error);
  if (failed?.error) {
    throw new Error(failed.error.message);
  }
  return results;
}
