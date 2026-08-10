import { useState, useEffect } from "react";
import { GripVertical } from "lucide-react";
import { toast } from "sonner";
import { SpaceCard } from "@/components/SpaceCard";
import { type Space } from "@/lib/spaces";
import { CARD_SECTION_KEYS, CARD_SECTION_LABELS, type CardSectionKey, useCardLayout, useSaveCardLayout } from "@/lib/useCardLayout";
import { DndContext, type DragEndEvent, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { CapacityIconSection } from "./shared";

export const DUMMY_SPACE: Space = {
  id: "dummy",
  slug: null,
  name: "Exempel-lokal",
  space_kind: "study",
  category: "",
  description:
    "Detta är en förhandsvisning. Ändringar i listan här bredvid uppdaterar ordningen på sektionerna i alla lokalkort i studentvyn.",
  intent: [],
  noise: ["Samtalston"],
  equipment: ["Whiteboard", "Datorer"],
  facilities: ["Dagsljus", "Mat tillåten"],
  lokaltyp: ["Studieplats"],
  image_url: null,
  images: [],
  image_alts: [],
  image_alts_en: [],
  map_url: "#",
  map_url_en: null,
  booking_url: "#",
  booking_url_en: null,
  group_booking_url: "#",
  group_booking_url_en: null,
  group_booking_label: null,
  group_booking_label_en: null,
  book_now_url: null,
  book_now_url_en: null,
  sort_order: 0,
  floor: "Plan 3",
  located_in: "Biblioteket",
  capacity: 24,
  computer_count: null,
  informal_seat_count: null,
  tags: {},
  notice: "Exempel på varningsruta – t.ex. tillfälligt stängt eller ombyggnation.",
  name_en: null,
  description_en: null,
  floor_en: null,
  located_in_en: null,
  notice_en: null,
  info: "Exempel på informationsruta – t.ex. öppettider eller praktisk info.",
  info_en: null,
  show_capacity_publicly: true,
  description_inline: false,

  show_occupancy: true,
  countmatters_sensor_id: null,
  booking_room_number: null,
  hidden: false,
};

export function CardLayoutTab() {
  const { data: saved = [...CARD_SECTION_KEYS] } = useCardLayout();
  const [order, setOrder] = useState<CardSectionKey[]>(saved);
  const save = useSaveCardLayout();

  // Sync when remote layout loads/changes.
  useEffect(() => {
    setOrder(saved); /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [saved.join("|")]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = order.indexOf(active.id as CardSectionKey);
    const newIdx = order.indexOf(over.id as CardSectionKey);
    if (oldIdx < 0 || newIdx < 0) return;
    setOrder(arrayMove(order, oldIdx, newIdx));
  };

  const dirty = JSON.stringify(order) !== JSON.stringify(saved);

  return (
    <div className="grid lg:grid-cols-[360px_1fr] gap-6">
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-bold">Kortlayout</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Dra för att ändra ordningen på sektionerna i lokalkorten. Bilden och knappen "Visa beskrivning" har fasta
            positioner.
          </p>
        </div>

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={order} strategy={verticalListSortingStrategy}>
            <ul className="space-y-2">
              {order.map((k) => (
                <SortableSectionRow key={k} id={k} label={CARD_SECTION_LABELS[k]} />
              ))}
            </ul>
          </SortableContext>
        </DndContext>

        <div className="flex gap-2">
          <button
            disabled={!dirty || save.isPending}
            onClick={() =>
              save.mutate(order, {
                onSuccess: () => toast.success("Layouten sparad"),
                onError: (e) => toast.error((e as Error).message),
              })
            }
            className="inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50"
          >
            Spara layout
          </button>
          <button
            disabled={!dirty}
            onClick={() => setOrder(saved)}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-accent disabled:opacity-50"
          >
            Återställ
          </button>
        </div>
      </div>

      <div className="space-y-6">
        <StudySpacePreviewCard order={order} />

        <GroupRoomPreviewCard order={order} />

        <CapacityIconSection />
      </div>
    </div>
  );
}

export function StudySpacePreviewCard({ order }: { order: CardSectionKey[] }) {
  const [status, setStatus] = useState<"free" | "moderate" | "busy">("moderate");
  const level = status === "free" ? 1 : status === "moderate" ? 2 : 3;
  return (
    <div>
      <div className="flex items-center justify-between mb-2 gap-3 flex-wrap">
        <h3 className="text-sm font-semibold text-muted-foreground">Förhandsvisning – studieplats</h3>
        <div className="inline-flex rounded-full border border-border bg-card p-0.5 text-xs">
          {(["free", "moderate", "busy"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={`px-3 py-1 rounded-full transition-colors ${status === s ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-accent"}`}
            >
              {s === "free" ? "Gott om plats" : s === "moderate" ? "Halvfullt" : "Mycket folk"}
            </button>
          ))}
        </div>
      </div>
      <div className="max-w-[920px]">
        <SpaceCard
          space={DUMMY_SPACE}
          layoutOverride={order}
          previewOccupancy={{ level: level as 1 | 2 | 3, status }}
        />
      </div>
    </div>
  );
}

export const DUMMY_GROUP_ROOM: Space = {
  ...DUMMY_SPACE,
  id: "dummy-group",
  name: "Grupprum 3001",
  category: "",
  description:
    "Exempel på grupprum. Här ser du hur kortet ser ut med statusbadge för ledigt/upptaget och knappen Boka nu.",
  lokaltyp: ["Grupprum"],
  noise: ["Samtalston"],
  equipment: ["Whiteboard", "Skärm"],
  facilities: ["Dagsljus"],
  floor: "Plan 3",
  located_in: "Biblioteket",
  capacity: 6,
  computer_count: null,
  informal_seat_count: null,
  notice: null,
  info: null,
  group_booking_url: "#",
  book_now_url: "#",
  booking_room_number: 3001,
  show_occupancy: false,
};

export function GroupRoomPreviewCard({ order }: { order: CardSectionKey[] }) {
  const [status, setStatus] = useState<"free" | "busy">("free");
  return (
    <div>
      <div className="flex items-center justify-between mb-2 gap-3 flex-wrap">
        <h3 className="text-sm font-semibold text-muted-foreground">Förhandsvisning – grupprum</h3>
        <div className="inline-flex rounded-full border border-border bg-card p-0.5 text-xs">
          <button
            onClick={() => setStatus("free")}
            className={`px-3 py-1 rounded-full transition-colors ${status === "free" ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-accent"}`}
          >
            Ledigt (Boka nu)
          </button>
          <button
            onClick={() => setStatus("busy")}
            className={`px-3 py-1 rounded-full transition-colors ${status === "busy" ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-accent"}`}
          >
            Upptaget
          </button>
        </div>
      </div>
      <div className="max-w-[920px]">
        <SpaceCard space={DUMMY_GROUP_ROOM} layoutOverride={order} previewGroupRoom={{ status }} />
      </div>
    </div>
  );
}

export function SortableSectionRow({ id, label }: { id: string; label: string }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  return (
    <li
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2.5"
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
        aria-label="Dra för att flytta"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <span className="text-sm">{label}</span>
    </li>
  );
}

