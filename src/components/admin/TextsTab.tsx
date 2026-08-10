import { useState, useEffect } from "react";
import { Upload } from "lucide-react";
import { toast } from "sonner";
import { ChairIcon } from "@/components/icons/ChairIcon";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useAnnouncementAdmin, useSaveAnnouncement } from "@/lib/useAnnouncement";
import { useCapacityIcon, useSaveCapacityIcon } from "@/lib/useCapacityIcon";
import { UI_TEXT_DEFAULTS, UI_TEXT_DEFAULTS_EN, UI_TEXT_META, type UiTextKey, useSaveUiText, useUiTextAdmin } from "@/lib/useUiText";
import { cn } from "@/lib/utils";
import { LangPairEditor } from "./shared";

export function LandingMessageTab() {
  return (
    <div className="space-y-6 max-w-4xl">
      <AnnouncementSection />
      <UiTextGroupCard
        title="Startsida"
        description="Texter som visas överst på startsidan."
        keys={["landing_title", "landing_intro", "landing_body"]}
      />
      <UiTextGroupCard
        title="Tomt resultat"
        description="Texter som visas när inga lokaler matchar de valda filtren."
        keys={["empty_title", "empty_suggest_template", "empty_fallback"]}
      />
    </div>
  );
}

export function UiTextGroupCard({
  title,
  description,
  keys,
}: {
  title: string;
  description: string;
  keys: UiTextKey[];
}) {
  return (
    <div className="bg-card rounded-2xl border border-border p-6 space-y-6">
      <div>
        <h2 className="text-lg font-bold">{title}</h2>
        <p className="text-sm text-muted-foreground mt-1">{description}</p>
      </div>
      {keys.map((k, i) => (
        <div key={k} className={cn(i > 0 && "pt-6 border-t border-border")}>
          <UiTextEditor uiKey={k} compact />
        </div>
      ))}
    </div>
  );
}

export function AnnouncementSection() {
  const { data, isLoading } = useAnnouncementAdmin();
  const save = useSaveAnnouncement();
  const [sv, setSv] = useState("");
  const [en, setEn] = useState("");

  useEffect(() => {
    if (data) {
      setSv(data.sv);
      setEn(data.en);
    }
  }, [data]);

  const enabled = data?.enabled ?? false;

  return (
    <div className="bg-card rounded-2xl border border-border p-6 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold">Driftmeddelande på startsidan</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Visas som en banner högst upp på startsidan, direkt under sidhuvudet. Använd t.ex. för att informera om
            renovering eller större ändringar. Besökare kan stänga bannern, men den dyker upp igen om du redigerar
            texten.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-sm font-medium">{enabled ? "På" : "Av"}</span>
          <Switch
            checked={enabled}
            disabled={isLoading || save.isPending}
            onCheckedChange={(v) =>
              save.mutate(
                { enabled: v },
                { onSuccess: () => toast.success(v ? "Meddelande aktiverat" : "Meddelande avstängt") },
              )
            }
            aria-label="Visa driftmeddelande"
          />
        </div>
      </div>
      <LangPairEditor
        labelSv="Meddelande"
        labelEn="Message"
        rows={3}
        valueSv={sv}
        valueEn={en}
        isPending={save.isPending}
        isLoading={isLoading}
        onSaveSv={(v) => save.mutate({ sv: v }, { onSuccess: () => toast.success("Sparat (SV)") })}
        onSaveEn={(v) => save.mutate({ en: v }, { onSuccess: () => toast.success("Sparat (EN)") })}
      />
    </div>
  );
}

export function UiTextEditor({ uiKey, compact = false }: { uiKey: UiTextKey; compact?: boolean }) {
  const { data: pair, isLoading } = useUiTextAdmin(uiKey);
  const save = useSaveUiText();
  const meta = UI_TEXT_META[uiKey];

  const inner = (
    <div className="space-y-3">
      <div>
        <h3 className={cn("font-bold", compact ? "text-base" : "text-lg")}>{meta.title}</h3>
        <p className={cn("text-muted-foreground", compact ? "text-xs mt-0.5" : "text-sm mt-1")}>
          {meta.description}
        </p>
      </div>
      <LangPairEditor
        labelSv={meta.title}
        labelEn={meta.title}
        rows={meta.rows ?? 3}
        valueSv={pair?.sv ?? ""}
        valueEn={pair?.en ?? ""}
        defaultSv={UI_TEXT_DEFAULTS[uiKey]}
        defaultEn={UI_TEXT_DEFAULTS_EN[uiKey]}
        isPending={save.isPending}
        isLoading={isLoading}
        onSaveSv={(v) =>
          save.mutate({ key: uiKey, value: v, lang: "sv" }, { onSuccess: () => toast.success("Sparat (SV)") })
        }
        onSaveEn={(v) =>
          save.mutate({ key: uiKey, value: v, lang: "en" }, { onSuccess: () => toast.success("Sparat (EN)") })
        }
      />
    </div>
  );

  if (compact) return inner;

  return (
    <div className="bg-card rounded-2xl border border-border p-6 space-y-4">
      {inner}
    </div>
  );
}

