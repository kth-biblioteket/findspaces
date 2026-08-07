import { useUiText } from "@/lib/useUiText";
import { sanitizeHtml, DESCRIPTION_SANITIZE_OPTIONS } from "@/lib/sanitizeHtml";

const LINK_OPTIONS = {
  ...DESCRIPTION_SANITIZE_OPTIONS,
  linkClass: "font-medium text-[var(--kth-blue)] underline hover:opacity-80",
};

function paragraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

type LandingTextProps = {
  /** When true, remove bottom padding so the text sits tight against the filter service. */
  compact?: boolean;
};

/** Editor-controlled intro (large) and body text (white background) on the landing page. */
export function LandingText({ compact = false }: LandingTextProps) {
  const { data: intro } = useUiText("landing_intro");
  const { data: body } = useUiText("landing_body");


  const introParts = paragraphs(intro ?? "");
  const bodyParts = paragraphs(body ?? "");
  const hasIntro = introParts.length > 0;
  const hasBody = bodyParts.length > 0;

  if (!hasIntro && !hasBody) return null;

  return (
    <div
      className={[
        "max-w-7xl mx-auto px-4 sm:px-6 pb-3",
        hasIntro ? "space-y-4" : "-mt-2 space-y-0",
      ].join(" ")}
    >
      {hasIntro && (
        <div className="max-w-4xl space-y-3">
          {introParts.map((p, i) => (
            <p
              key={i}
              className="text-lg sm:text-xl leading-relaxed text-foreground"
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(p, LINK_OPTIONS) }}
            />
          ))}
        </div>
      )}
      {hasBody && (
        <div
          className={[
            "max-w-3xl rounded-lg bg-card space-y-3",
            hasIntro ? "py-2" : "pt-2 pb-2",
          ].join(" ")}
        >
          {bodyParts.map((p, i) => (
            <p
              key={i}
              className="text-sm sm:text-base leading-relaxed text-foreground"
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(p, LINK_OPTIONS) }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
