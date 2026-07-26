/**
 * Regression test for the SSR DOMPurify crash.
 *
 * Renders a page containing a SpaceCard whose description contains HTML,
 * using react-dom/server in a DOM-less (server-like) environment. Before the
 * fix this threw "DOMPurify.sanitize is not a function", which is what made a
 * plain GET of the start page fall back to client rendering.
 *
 * Run with: bunx vitest run src/components/SpaceCard.ssr.test.tsx
 */
import { expect, test } from "vitest";
import { renderToString } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SpaceCard } from "@/components/SpaceCard";
import type { Space } from "@/lib/spaces";
import { sanitizeHtml, DESCRIPTION_SANITIZE_OPTIONS } from "@/lib/sanitizeHtml";

const HTML_DESCRIPTION =
  'I Entréhallen hittar du <a href="https://storiescafe.se/kth/">Café Stories</a>. ' +
  "<strong>Öppet</strong> vardagar.<script>alert(1)</script>";

const space: Space = {
  id: "ssr-test-space",
  slug: "cafe-stories",
  name: "Café Stories",
  name_en: null,
  space_kind: "service",
  category: "service",
  description: HTML_DESCRIPTION,
  description_en: null,
  description_inline: true,
  intent: [],
  noise: [],
  equipment: [],
  facilities: [],
  lokaltyp: [],
  image_url: null,
  images: [],
  image_alts: [],
  image_alts_en: [],
  map_url: null,
  map_url_en: null,
  booking_url: null,
  booking_url_en: null,
  group_booking_url: null,
  group_booking_url_en: null,
  book_now_url: null,
  book_now_url_en: null,
  sort_order: 1,
  floor: null,
  floor_en: null,
  located_in: null,
  located_in_en: null,
  capacity: null,
  computer_count: null,
  informal_seat_count: null,
  tags: {},
  notice: null,
  notice_en: null,
  info: null,
  info_en: null,
  show_capacity_publicly: false,
  show_occupancy: false,
  countmatters_sensor_id: null,
  booking_room_number: null,
  hidden: false,
};

test("server-renders a card with an HTML description without DOMPurify errors", () => {
  // Assert we really are in a server-like environment (no document).
  expect(typeof document).toBe("undefined");

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, enabled: false } },
  });

  const html = renderToString(
    <QueryClientProvider client={queryClient}>
      <main>
        <SpaceCard space={space} spaces={[space]} />
      </main>
    </QueryClientProvider>,
  );

  expect(html).toContain("Café Stories");
  expect(html).toContain('href="https://storiescafe.se/kth/"');
  expect(html).toContain('target="_blank"');
  expect(html).toContain('rel="noopener noreferrer"');
  expect(html).not.toContain("<script");
  expect(html).not.toContain("alert(1)");
});

test("sanitizer keeps the allowed tags and drops everything else", () => {
  const out = sanitizeHtml(
    "<p>a<b>b</b><i>c</i><em>d</em><strong>e</strong><br><ul><li>f</li></ul>" +
      '<span title="t">g</span><h1>h</h1><img src="x.png" onerror="x()">' +
      '<a href="javascript:alert(1)">bad</a><a href="/karta">ok</a></p>',
    DESCRIPTION_SANITIZE_OPTIONS,
  );

  expect(out).toContain("<p>");
  expect(out).toContain("<b>b</b>");
  expect(out).toContain("<i>c</i>");
  expect(out).toContain("<em>d</em>");
  expect(out).toContain("<strong>e</strong>");
  expect(out).toContain("<br />");
  expect(out).toContain("<ul><li>f</li></ul>");
  expect(out).toContain('<span title="t">g</span>');
  expect(out).not.toContain("<h1");
  expect(out).not.toContain("<img");
  expect(out).not.toContain("onerror");
  expect(out).not.toContain("javascript:");
  expect(out).toContain('<a href="/karta" target="_blank" rel="noopener noreferrer">ok</a>');
});
