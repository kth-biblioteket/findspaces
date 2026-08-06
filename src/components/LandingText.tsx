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

/** Editor-controlled intro (large) and body text (grey box) on the landing page. */
export function LandingText() {
  const { data: intro } = useUiText("landing_intro");
  const { data: body } = useUiText("landing_body");

  const introParts = paragraphs(intro ?? "");
  const bodyParts = paragraphs(body ?? "");

  if (introParts.length === 0 && bodyParts.length === 0) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-6 space-y-5">
      {introParts.length > 0 && (
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
      {bodyParts.length > 0 && (
        <div className="max-w-3xl rounded-lg bg-secondary/60 px-5 py-4 space-y-3">
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
