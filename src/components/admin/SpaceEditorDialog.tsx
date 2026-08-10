import { type Dispatch, type SetStateAction } from "react";
import { DndContext, type DragEndEvent, SortableContext, closestCenter, verticalListSortingStrategy } from "./dndReexports";
import { DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { type FilterCategoryRow, type FilterOption, type Space } from "@/lib/spaces";
import { cn } from "@/lib/utils";
import { DynamicCategoryField, Field, ImageDropzone, LinkSyntaxHelp, SortableImageRow } from "./shared";
import { SpaceCardPreview } from "./SpaceCardPreview";
import { MAX_IMAGES, type FormState, getFormValues, setFormValues } from "./adminForm";

export function SpaceEditorDialog({
  form,
  setForm,
  spaces,
  categories,
  byKey,
  spaceKindCat,
  spaceKindOptions,
  arbetssattCat,
  arbetssattOptions,
  editTab,
  setEditTab,
  isDirty,
  saving,
  formErrors,
  handleSave,
  handleDialogOpenChange,
  sensors,
  handleImagesDragEnd,
  imageDates,
  setAlt,
  setAltEn,
  removeImage,
  uploadBusy,
  handleUploadFiles,
}: {
  form: FormState;
  setForm: Dispatch<SetStateAction<FormState>>;
  spaces: Space[];
  categories: FilterCategoryRow[];
  byKey: Record<string, FilterOption[]>;
  spaceKindCat?: FilterCategoryRow;
  spaceKindOptions: FilterOption[];
  arbetssattCat?: FilterCategoryRow;
  arbetssattOptions: FilterOption[];
  editTab: "basic" | "filter" | "text" | "media" | "advanced";
  setEditTab: (v: "basic" | "filter" | "text" | "media" | "advanced") => void;
  isDirty: boolean;
  saving: boolean;
  formErrors: string[];
  handleSave: () => void;
  handleDialogOpenChange: (next: boolean) => void;
  sensors: ReturnType<typeof import("@dnd-kit/core").useSensors>;
  handleImagesDragEnd: (e: DragEndEvent) => void;
  imageDates: Record<string, string | null>;
  setAlt: (i: number, v: string) => void;
  setAltEn: (i: number, v: string) => void;
  removeImage: (i: number) => void;
  uploadBusy: boolean;
  handleUploadFiles: (files: FileList | File[]) => void | Promise<void>;
}) {
  return (
    <DialogContent className="max-w-6xl w-[calc(100vw-2rem)] h-[90vh] p-0 gap-0 flex flex-col overflow-hidden">
      <DialogHeader className="px-6 pt-5 pb-3 border-b border-border shrink-0">
        <DialogTitle className="flex items-center gap-2 flex-wrap text-lg">
          <span>{form.id ? "Redigera lokal" : "Ny lokal"}</span>
          {form.name && <span className="text-muted-foreground font-normal">— {form.name}</span>}
          {form.id && form.id && spaces.find((s) => s.id === form.id)?.hidden && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border font-normal">
              Dold
            </span>
          )}
          {isDirty && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200 font-normal">
              Osparade ändringar
            </span>
          )}
        </DialogTitle>
      </DialogHeader>

      <div className="flex-1 flex min-h-0">
      <Tabs
        value={editTab}
        onValueChange={(v) => setEditTab(v as typeof editTab)}
        className="flex-1 flex flex-col min-h-0"
      >
        <div className="px-6 pt-3 shrink-0 border-b border-border overflow-x-auto">
          <TabsList className="bg-transparent p-0 h-auto gap-1">
            <TabsTrigger
              value="basic"
              className="rounded-t-md rounded-b-none data-[state=active]:bg-accent data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-primary"
            >
              Grund
            </TabsTrigger>
            <TabsTrigger
              value="filter"
              className="rounded-t-md rounded-b-none data-[state=active]:bg-accent data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-primary"
            >
              Filter
            </TabsTrigger>
            <TabsTrigger
              value="text"
              className="rounded-t-md rounded-b-none data-[state=active]:bg-accent data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-primary"
            >
              Texter
            </TabsTrigger>
            <TabsTrigger
              value="media"
              className="rounded-t-md rounded-b-none data-[state=active]:bg-accent data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-primary"
            >
              Bilder & länkar
            </TabsTrigger>
            <TabsTrigger
              value="advanced"
              className="rounded-t-md rounded-b-none data-[state=active]:bg-accent data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-primary"
            >
              Avancerat
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 min-h-0">
          <TabsContent value="basic" className="mt-0 space-y-5 focus-visible:outline-none">
            <Field
              label={
                spaceKindCat ? `${spaceKindCat.title} (vad letar besökaren efter?)` : "Vad letar du efter?"
              }
            >
              <div className="flex flex-wrap gap-2">
                {spaceKindOptions.map((o) => {
                  const key = o.value_key ?? "";
                  const active = form.space_kind === key;
                  return (
                    <button
                      key={o.id}
                      type="button"
                      onClick={() => setForm({ ...form, space_kind: key })}
                      className={cn(
                        "rounded-full border px-3 py-1.5 text-sm transition",
                        active
                          ? "bg-[var(--kth-blue)] text-white border-[var(--kth-blue)]"
                          : "bg-card text-foreground border-border hover:bg-accent",
                      )}
                    >
                      {o.label}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Service- och skapandelokaler visas i egna flikar i studentvyn – utan beläggning, bokning
                eller ljudnivå.
              </p>
            </Field>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Namn (SV)">
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
                />
              </Field>
              <Field label="Name (EN)">
                <input
                  value={form.name_en}
                  onChange={(e) => setForm({ ...form, name_en: e.target.value })}
                  placeholder="Lämna tomt = SV fallback"
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
                />
              </Field>
            </div>

            <Field label="Kort-ID / slug (valfritt)">
              <input
                value={form.slug}
                onChange={(e) =>
                  setForm({
                    ...form,
                    slug: e.target.value
                      .toLowerCase()
                      .replace(/[^a-z0-9-]/g, "-")
                      .replace(/-+/g, "-"),
                  })
                }
                placeholder="t.ex. maxwell eller norra-arkaden"
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm font-mono"
              />
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Kort, läsbart ID som används i interna länkar och delbara URL:er. Endast små bokstäver,
                siffror och bindestreck.
                {form.slug && (
                  <>
                    {" "}
                    Länksyntax:{" "}
                    <code className="bg-secondary px-1 py-0.5 rounded">[[{form.slug}|valfri text]]</code>
                    {" · "}Direktlänk:{" "}
                    <code className="bg-secondary px-1 py-0.5 rounded">?highlight={form.slug}</code>
                  </>
                )}
              </p>
            </Field>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Våningsplan (SV)">
                <input
                  value={form.floor}
                  onChange={(e) => setForm({ ...form, floor: e.target.value })}
                  placeholder="t.ex. Plan 3"
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
                />
              </Field>
              <Field label="Floor (EN)">
                <input
                  value={form.floor_en}
                  onChange={(e) => setForm({ ...form, floor_en: e.target.value })}
                  placeholder="e.g. Floor 3"
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
                />
              </Field>
              <Field label="Ligger i lokal (SV)">
                <input
                  value={form.located_in}
                  onChange={(e) => setForm({ ...form, located_in: e.target.value })}
                  placeholder="t.ex. Biblioteket"
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
                />
              </Field>
              <Field label="Located in (EN)">
                <input
                  value={form.located_in_en}
                  onChange={(e) => setForm({ ...form, located_in_en: e.target.value })}
                  placeholder="e.g. The Library"
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
                />
              </Field>
            </div>

            <div>
              <div className="text-sm font-medium mb-2">Antal platser</div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Field label="Studieplatser (bord + stol)">
                  <input
                    type="number"
                    min={1}
                    value={form.capacity}
                    onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                    placeholder="t.ex. 4"
                    className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
                  />
                </Field>
                <Field label="Nedslagsplatser (fåtöljer, soffor)">
                  <input
                    type="number"
                    min={1}
                    value={form.informal_seat_count}
                    onChange={(e) => setForm({ ...form, informal_seat_count: e.target.value })}
                    placeholder="t.ex. 6"
                    className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
                  />
                </Field>
                <Field label="Datorplatser">
                  <input
                    type="number"
                    min={1}
                    value={form.computer_count}
                    onChange={(e) => setForm({ ...form, computer_count: e.target.value })}
                    placeholder="t.ex. 3"
                    className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
                  />
                </Field>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Lämna tomt om typen inte finns i lokalen. Fyllda värden visas automatiskt på lokalkortet.
              </p>
            </div>
          </TabsContent>

          <TabsContent value="filter" className="mt-0 space-y-5 focus-visible:outline-none">
            <Field
              label={arbetssattCat ? `${arbetssattCat.title} (hur vill du arbeta?)` : "Hur vill du arbeta?"}
            >
              <div className="flex flex-wrap gap-2">
                {arbetssattOptions.map((o) => {
                  const key = o.value_key ?? "";
                  const active = form.intent.includes(key);
                  return (
                    <button
                      key={o.id}
                      type="button"
                      onClick={() => {
                        const next = active ? form.intent.filter((v) => v !== key) : [...form.intent, key];
                        setForm({ ...form, intent: next });
                      }}
                      className={cn(
                        "rounded-full border px-3 py-1.5 text-sm transition",
                        active
                          ? "bg-[var(--kth-blue)] text-white border-[var(--kth-blue)]"
                          : "bg-card text-foreground border-border hover:bg-accent",
                      )}
                    >
                      {o.label}
                    </button>
                  );
                })}
              </div>
            </Field>

            {categories
              .filter((c) => !c.special_kind)
              .map((cat) => (
                <DynamicCategoryField
                  key={cat.id}
                  cat={cat}
                  options={byKey[cat.key] ?? []}
                  values={getFormValues(form, cat.key)}
                  onChange={(values) => setForm(setFormValues(form, cat.key, values))}
                />
              ))}
          </TabsContent>

          <TabsContent value="text" className="mt-0 space-y-5 focus-visible:outline-none">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field
                label={
                  <span className="flex items-center gap-2">
                    Beskrivning (SV) <LinkSyntaxHelp slug={form.slug} />
                  </span>
                }
              >
                <textarea
                  rows={5}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm font-mono"
                />
              </Field>
              <Field label="Description (EN)">
                <textarea
                  rows={5}
                  value={form.description_en}
                  onChange={(e) => setForm({ ...form, description_en: e.target.value })}
                  placeholder="Lämna tomt = SV fallback"
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm font-mono"
                />
              </Field>
            </div>

            <label className="flex items-start gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={form.description_inline}
                onChange={(e) => setForm({ ...form, description_inline: e.target.checked })}
                className="mt-0.5"
              />
              <span>
                <span className="font-medium">Visa beskrivningen direkt på kortet</span>
                <span className="block text-xs text-muted-foreground">
                  När ikryssad visas beskrivningen alltid på kortet istället för att gömmas bakom en i-ikon.
                </span>
              </span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field
                label={
                  <span className="flex items-center gap-2">
                    Tillfällig notis, gul ruta (SV) <LinkSyntaxHelp slug={form.slug} />
                  </span>
                }
              >
                <textarea
                  rows={2}
                  value={form.notice}
                  onChange={(e) => setForm({ ...form, notice: e.target.value })}
                  placeholder="Lämna tomt om ingen notis ska visas"
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
                />
              </Field>
              <Field label="Temporary notice, yellow (EN)">
                <textarea
                  rows={2}
                  value={form.notice_en}
                  onChange={(e) => setForm({ ...form, notice_en: e.target.value })}
                  placeholder="Lämna tomt = SV fallback"
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
                />
              </Field>
              <Field
                label={
                  <span className="flex items-center gap-2">
                    Information på kortet (SV) <LinkSyntaxHelp slug={form.slug} />
                  </span>
                }
              >
                <textarea
                  rows={2}
                  value={form.info}
                  onChange={(e) => setForm({ ...form, info: e.target.value })}
                  placeholder='T.ex. "Möblerna är tillfälliga och byts ut under hösten."'
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
                />
              </Field>
              <Field label="Info on the card (EN)">
                <textarea
                  rows={2}
                  value={form.info_en}
                  onChange={(e) => setForm({ ...form, info_en: e.target.value })}
                  placeholder="Lämna tomt = SV fallback"
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
                />
              </Field>
            </div>
          </TabsContent>

          <TabsContent value="media" className="mt-0 space-y-6 focus-visible:outline-none">
            <section className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold">
                  Bilder ({form.images.length} / {MAX_IMAGES})
                </h3>
                <p className="text-xs text-muted-foreground">
                  Första bilden är primär och används som miniatyr.
                </p>
              </div>
              {form.images.length > 0 && (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleImagesDragEnd}
                >
                  <SortableContext
                    items={form.images.map((u, i) => `${i}::${u}`)}
                    strategy={verticalListSortingStrategy}
                  >
                    <ul className="space-y-3">
                      {form.images.map((url, i) => (
                        <SortableImageRow
                          key={`${i}::${url}`}
                          id={`${i}::${url}`}
                          url={url}
                          index={i}
                          altSv={form.image_alts[i] ?? ""}
                          altEn={form.image_alts_en[i] ?? ""}
                          uploadedAt={imageDates[url]}
                          onAltSv={(v) => setAlt(i, v)}
                          onAltEn={(v) => setAltEn(i, v)}
                          onRemove={() => removeImage(i)}
                        />
                      ))}
                    </ul>
                  </SortableContext>
                </DndContext>
              )}
              <ImageDropzone
                disabled={form.images.length >= MAX_IMAGES || uploadBusy}
                busy={uploadBusy}
                remaining={MAX_IMAGES - form.images.length}
                maxImages={MAX_IMAGES}
                onFiles={handleUploadFiles}
              />
            </section>

            <section className="space-y-3">
              <h3 className="text-sm font-semibold">Karta och bokning</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Länk till karta (SV)">
                  <input
                    type="url"
                    value={form.map_url}
                    onChange={(e) => setForm({ ...form, map_url: e.target.value })}
                    placeholder="https://..."
                    className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
                  />
                </Field>
                <Field label="Map link (EN)">
                  <input
                    type="url"
                    value={form.map_url_en}
                    onChange={(e) => setForm({ ...form, map_url_en: e.target.value })}
                    placeholder="Lämna tomt = SV fallback"
                    className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
                  />
                </Field>
                <Field label="Bokningsschema övningssalar (SV)">
                  <input
                    type="url"
                    value={form.booking_url}
                    onChange={(e) => setForm({ ...form, booking_url: e.target.value })}
                    placeholder="https://..."
                    className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Används för övningssalar. För grupprum, se nedan.
                  </p>
                </Field>
                <Field label="Practice room schedule (EN)">
                  <input
                    type="url"
                    value={form.booking_url_en}
                    onChange={(e) => setForm({ ...form, booking_url_en: e.target.value })}
                    placeholder="Lämna tomt = SV fallback"
                    className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
                  />
                </Field>
              </div>
            </section>

            <section className="space-y-3">
              <h3 className="text-sm font-semibold">Grupprum</h3>
              <p className="text-xs text-muted-foreground">Fyll i endast för lokaler av typen grupprum.</p>
              <Field label="Bokningsrumsnummer">
                <input
                  value={form.booking_room_number}
                  onChange={(e) =>
                    setForm({ ...form, booking_room_number: e.target.value.replace(/[^0-9]/g, "") })
                  }
                  inputMode="numeric"
                  placeholder="t.ex. 4"
                  className="w-full sm:w-40 rounded-lg border border-border bg-card px-3 py-2 text-sm font-mono"
                />
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                  Rumsnummer (1–21) i KTH:s bokningssystem. När det matchar visas en indikator om
                  grupprummet är <strong>ledigt</strong> eller <strong>upptaget</strong> just nu.
                </p>
              </Field>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Länk till boka grupprum (SV)">
                  <input
                    type="url"
                    value={form.group_booking_url}
                    onChange={(e) => setForm({ ...form, group_booking_url: e.target.value })}
                    placeholder="https://apps.lib.kth.se/mrbsgrupprum/day.php?area=1"
                    className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
                  />
                </Field>
                <Field label="Book group room link (EN)">
                  <input
                    type="url"
                    value={form.group_booking_url_en}
                    onChange={(e) => setForm({ ...form, group_booking_url_en: e.target.value })}
                    placeholder="Lämna tomt = SV fallback"
                    className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
                  />
                </Field>
                <Field label="Knapptext för länken (SV)">
                  <input
                    type="text"
                    value={form.group_booking_label}
                    onChange={(e) => setForm({ ...form, group_booking_label: e.target.value })}
                    placeholder="Boka grupprum"
                    className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Lämna tomt = "Boka grupprum". Skriv t.ex. "Boka resursrum" för resursrum.
                  </p>
                </Field>
                <Field label="Button label (EN)">
                  <input
                    type="text"
                    value={form.group_booking_label_en}
                    onChange={(e) => setForm({ ...form, group_booking_label_en: e.target.value })}
                    placeholder="Lämna tomt = SV fallback"
                    className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
                  />
                </Field>
                <Field label='"Boka nu" – ledigt grupprum (SV)'>
                  <input
                    type="text"
                    value={form.book_now_url}
                    onChange={(e) => setForm({ ...form, book_now_url: e.target.value })}
                    placeholder="https://.../edit_entry.php?area=1&room={room}&hour={hour}..."
                    className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Mall. Platshållare: <code>{"{room}"}</code>, <code>{"{year}"}</code>,{" "}
                    <code>{"{month}"}</code>, <code>{"{day}"}</code>, <code>{"{hour}"}</code>,{" "}
                    <code>{"{minute}"}</code>.
                  </p>
                </Field>
                <Field label='"Book now" – free group room (EN)'>
                  <input
                    type="text"
                    value={form.book_now_url_en}
                    onChange={(e) => setForm({ ...form, book_now_url_en: e.target.value })}
                    placeholder="Lämna tomt = SV fallback"
                    className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
                  />
                </Field>
              </div>
            </section>
          </TabsContent>

          <TabsContent value="advanced" className="mt-0 space-y-5 focus-visible:outline-none">
            <section className="space-y-3">
              <h3 className="text-sm font-semibold">Realtidsdata (beläggning)</h3>
              <Field label="Countmatters sensor-ID">
                <input
                  value={form.countmatters_sensor_id}
                  onChange={(e) => setForm({ ...form, countmatters_sensor_id: e.target.value })}
                  placeholder="t.ex. Newton"
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm font-mono"
                />
              </Field>
              <label className="flex items-start gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.show_occupancy}
                  onChange={(e) => setForm({ ...form, show_occupancy: e.target.checked })}
                  className="mt-0.5 h-4 w-4 rounded border-border cursor-pointer accent-[var(--kth-blue)]"
                />
                <span>
                  Visa beläggningsindikator på lokalkortet (kan slås av vid tekniska problem utan att radera
                  sensor-ID:t)
                </span>
              </label>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Ange <strong>zonnamnet</strong> exakt som det står i Countmatters (t.ex.{" "}
                <span className="font-mono">Newton</span>, <span className="font-mono">Ångdomen</span>,{" "}
                <span className="font-mono">Södra Galleriet</span>). När namnet matchar en zon i KTH:s
                realtids-API visas en indikator (grön/gul/röd). Lämna tomt för lokaler utan mätare.
              </p>
            </section>

            {form.id && (
              <section className="space-y-2">
                <h3 className="text-sm font-semibold">Tekniskt</h3>
                <p className="text-xs text-muted-foreground">
                  Tekniskt ID: <code className="bg-secondary px-1 py-0.5 rounded text-xs">{form.id}</code>
                </p>
              </section>
            )}
          </TabsContent>
        </div>
      </Tabs>
      <aside className="hidden lg:block w-[24rem] shrink-0 border-l border-border bg-muted/30 overflow-y-auto p-4">
        <SpaceCardPreview form={form} />
      </aside>
      </div>

      <DialogFooter className="px-6 py-3 border-t border-border shrink-0 bg-card sm:flex-row sm:items-center sm:justify-between gap-3">
        {formErrors.length > 0 ? (
          <ul className="text-xs text-destructive space-y-0.5 sm:mr-auto text-left" role="alert">
            {formErrors.map((msg) => (
              <li key={msg}>{msg}</li>
            ))}
          </ul>
        ) : (
          <span className="sm:mr-auto" />
        )}
        <div className="flex gap-2 justify-end">
          <button
            onClick={() => handleDialogOpenChange(false)}
            className="px-4 py-2 rounded-lg text-sm border border-border"
          >
            Avbryt
          </button>
          <button
            disabled={saving || !form.name || !isDirty}
            onClick={handleSave}
            className="px-4 py-2 rounded-lg text-sm bg-primary text-primary-foreground disabled:opacity-50"
          >
            {saving ? "Sparar..." : isDirty ? "Spara ändringar" : "Sparat"}
          </button>
        </div>

      </DialogFooter>
    </DialogContent>
  );
}
