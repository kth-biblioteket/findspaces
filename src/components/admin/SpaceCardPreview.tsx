import { useEffect, useMemo, useRef, useState } from "react";
import { SpaceCard } from "@/components/SpaceCard";
import { formToSpace, type FormState } from "./adminForm";

/** The card's desktop layout needs roughly this width to render un-clipped. */
const CARD_WIDTH = 760;

/**
 * Live preview of the student-facing card while editing a space.
 * The card is rendered at full desktop width and scaled down to fit the
 * narrow editor sidebar, so the whole card is visible instead of cut off.
 */
export function SpaceCardPreview({ form }: { form: FormState }) {
  const space = useMemo(() => formToSpace(form), [form]);
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [height, setHeight] = useState<number | undefined>(undefined);

  useEffect(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner) return;
    const update = () => {
      const available = outer.clientWidth;
      const next = Math.min(1, available / CARD_WIDTH);
      setScale(next);
      setHeight(inner.offsetHeight * next);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(outer);
    ro.observe(inner);
    return () => ro.disconnect();
  }, [space]);

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold text-muted-foreground">Förhandsvisning</h3>
        <span className="text-[11px] text-muted-foreground">Som studenten ser kortet</span>
      </div>
      <div ref={outerRef} style={{ height }} className="overflow-hidden">
        <div
          ref={innerRef}
          style={{
            width: CARD_WIDTH,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
        >
          <SpaceCard space={space} />
        </div>
      </div>
      <p className="text-[11px] text-muted-foreground leading-relaxed">
        Beläggning och grupprumsstatus visas först när kortet är sparat och kopplat till realtidsdata.
      </p>
    </div>
  );
}
