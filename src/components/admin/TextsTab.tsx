import { useState, useEffect } from "react";
import { Upload } from "lucide-react";
import { toast } from "sonner";
import { ChairIcon } from "@/components/icons/ChairIcon";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useAnnouncementAdmin, useSaveAnnouncement } from "@/lib/useAnnouncement";
import { useBetaBadgeEnabled, useSaveBetaBadge } from "@/lib/useBetaBadge";
import { useCapacityIcon, useSaveCapacityIcon } from "@/lib/useCapacityIcon";
import { UI_TEXT_DEFAULTS, UI_TEXT_DEFAULTS_EN, UI_TEXT_META, type UiTextKey, useSaveUiText, useUiTextAdmin } from "@/lib/useUiText";
import { cn } from "@/lib/utils";
import { LangPairEditor } from "./shared";
import { DEFAULT_OG_IMAGE, processOgImage, useOgImage, useSaveOgImage } from "@/lib/useOgImage";

export function LandingMessageTab() {
  return (
    <div className="space-y-6 max-w-4xl">
      <AnnouncementSection />
      <BetaBadgeSection />
      <ShareImageSection />
      <UiTextGroupCard
        title="Delning av länk"
        description="Texten som visas under titeln när någon delar en länk till tjänsten. Titeln hämtas från rubriken på startsidan nedan."
        keys={["share_description"]}
      />
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

export function BetaBadgeSection() {
  const { data: enabled = true, isLoading } = useBetaBadgeEnabled();
  const save = useSaveBetaBadge();

  return (
    <div className="bg-card rounded-2xl border border-border p-6 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold">Beta-märkning på startsidan</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Visar en liten "Beta"-etikett bredvid rubriken högst upp på startsidan. Slå av den när
            tjänsten inte längre ska markeras som beta.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-sm font-medium">{enabled ? "På" : "Av"}</span>
          <Switch
            checked={enabled}
            disabled={isLoading || save.isPending}
            onCheckedChange={(v) =>
              save.mutate(v, {
                onSuccess: () => toast.success(v ? "Beta-märkning aktiverad" : "Beta-märkning avstängd"),
                onError: () => toast.error("Kunde inte spara."),
              })
            }
            aria-label="Visa Beta-märkning"
          />
        </div>
      </div>
    </div>
  );
}

export function ShareImageSection() {
  const { data: current, isLoading } = useOgImage();
  const save = useSaveOgImage();
  const [busy, setBusy] = useState(false);

  const preview = current || DEFAULT_OG_IMAGE;

  async function handleFile(file: File) {
    setBusy(true);
    try {
      const processed = await processOgImage(file);
      const path = `og/${processed.name}`;
      const { error } = await supabase.storage
        .from("space-images")
        .upload(path, processed, { contentType: "image/jpeg", upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from("space-images").getPublicUrl(path);
      await save.mutateAsync(`${data.publicUrl}?v=${Date.now()}`);
      toast.success("Delningsbilden är uppdaterad.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Uppladdningen misslyckades.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="bg-card rounded-2xl border border-border p-6 space-y-4">
      <div>
        <h2 className="text-lg font-bold">Delningsbild (länkförhandsvisning)</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Bilden som visas när någon delar en länk till tjänsten i t.ex. Slack, Teams, Facebook eller
          LinkedIn. Ladda upp en skärmavbild av startsidan – den beskärs automatiskt till 1200×630 px.
          Ändringen börjar gälla direkt, men sociala tjänster cachar tidigare bild och kan dröja tills de
          hämtar sidan igen.
        </p>
      </div>

      <div className="flex flex-wrap items-start gap-4">
        <img
          src={preview}
          alt="Förhandsvisning av delningsbilden"
          className="w-64 aspect-[1200/630] rounded-lg border border-border object-cover bg-muted"
        />
        <div className="space-y-2">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-accent">
            <Upload className="h-4 w-4" />
            {busy ? "Laddar upp…" : "Ladda upp ny bild"}
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              disabled={busy || isLoading}
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (f) void handleFile(f);
              }}
            />
          </label>
          {current && (
            <div>
              <button
                type="button"
                className="text-sm text-muted-foreground underline hover:text-foreground"
                onClick={() => {
                  void save.mutateAsync(null).then(() => toast.success("Återställd till standardbild."));
                }}
              >
                Återställ till standardbild
              </button>
            </div>
          )}
        </div>
      </div>
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

