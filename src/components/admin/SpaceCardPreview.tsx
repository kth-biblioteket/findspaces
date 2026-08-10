import { useMemo } from "react";
import { SpaceCard } from "@/components/SpaceCard";
import { formToSpace, type FormState } from "./adminForm";

/**
 * Live preview of the student-facing card while editing a space.
 * Rendered from the unsaved form state so the admin sees changes instantly.
 */
export function SpaceCardPreview({ form }: { form: FormState }) {
  const space = useMemo(() => formToSpace(form), [form]);
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold text-muted-foreground">Förhandsvisning</h3>
        <span className="text-[11px] text-muted-foreground">Som studenten ser kortet</span>
      </div>
      <SpaceCard space={space} />
      <p className="text-[11px] text-muted-foreground leading-relaxed">
        Beläggning och grupprumsstatus visas först när kortet är sparat och kopplat till realtidsdata.
      </p>
    </div>
  );
}
