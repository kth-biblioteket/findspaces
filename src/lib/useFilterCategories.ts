import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { FilterCategoryRow } from "./spaces";

const db = supabase as unknown as { from: (t: string) => any };

export function useFilterCategories() {
  return useQuery({
    queryKey: ["filter_categories"],
    queryFn: async (): Promise<FilterCategoryRow[]> => {
      const { data, error } = await db
        .from("filter_categories")
        .select("*")
        .order("sort_order");
      if (error) throw error;
      return (data ?? []) as FilterCategoryRow[];
    },
  });
}

export function useSaveCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<FilterCategoryRow> & { id?: string }) => {
      const { id, ...payload } = input;
      if (id) {
        const { error } = await db.from("filter_categories").update(payload).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await db.from("filter_categories").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["filter_categories"] }),
  });
}

export function useDeleteCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("filter_categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["filter_categories"] });
      qc.invalidateQueries({ queryKey: ["filter_options"] });
    },
  });
}

export function useReorderCategories() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ordered: FilterCategoryRow[]) => {
      await Promise.all(
        ordered.map((c, i) =>
          db.from("filter_categories").update({ sort_order: (i + 1) * 10 }).eq("id", c.id)
        )
      );
    },
    onMutate: async (ordered) => {
      await qc.cancelQueries({ queryKey: ["filter_categories"] });
      const previous = qc.getQueryData<FilterCategoryRow[]>(["filter_categories"]);
      qc.setQueryData<FilterCategoryRow[]>(["filter_categories"], ordered);
      return { previous };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.previous) qc.setQueryData(["filter_categories"], ctx.previous);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["filter_categories"] }),
  });
}

/** Generate a stable, URL-safe key from a Swedish title. */
export function slugifyKey(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[åä]/g, "a").replace(/ö/g, "o")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40) || "kategori";
}
