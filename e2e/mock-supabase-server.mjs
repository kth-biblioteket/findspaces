import { createServer } from "node:http";

const port = 8789;

const baseSpace = {
  slug: null,
  name_en: null,
  space_kind: "study",
  category: "study",
  description: "",
  description_en: "",
  description_inline: false,
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
  floor: null,
  floor_en: null,
  located_in: "KTH Biblioteket",
  located_in_en: "KTH Library",
  capacity: null,
  computer_count: null,
  informal_seat_count: null,
  tags: {},
  notice: null,
  notice_en: null,
  info: null,
  info_en: null,
  show_capacity_publicly: true,
  show_occupancy: false,
  countmatters_sensor_id: null,
  booking_room_number: null,
  hidden: false,
};

const studySpaces = Array.from({ length: 12 }, (_, index) => {
  const number = index + 1;
  return {
    ...baseSpace,
    id: `00000000-0000-4000-8000-${String(number).padStart(12, "0")}`,
    slug: `studieplats-${number}`,
    name: `Studieplats ${number}`,
    name_en: `English Study Space ${number}`,
    notice: number === 1 ? "Se även [[studieplats-10|Studieplats 10]]" : null,
    notice_en: number === 1 ? "See also [[studieplats-10|English Study Space 10]]" : null,
    intent: ["enskilt", "tillsammans", "grupprum"],
    noise: [number % 2 === 0 ? "Tyst" : "Samtal tillåtet"],
    lokaltyp: ["Studieplats", "Grupprum"],
    capacity: number < 5 ? 4 : 8,
    sort_order: number,
    floor: String(Math.ceil(number / 4)),
    floor_en: String(Math.ceil(number / 4)),
  };
});

const otherSpaces = [
  {
    ...baseSpace,
    id: "10000000-0000-4000-8000-000000000001",
    slug: "biblioteksservice",
    name: "Biblioteksservice",
    name_en: "Library Service",
    space_kind: "service",
    category: "service",
    facilities: ["Information"],
    lokaltyp: ["Service"],
    sort_order: 20,
  },
  {
    ...baseSpace,
    id: "10000000-0000-4000-8000-000000000002",
    slug: "skrivarservice",
    name: "Skrivarservice",
    name_en: "Printing Service",
    space_kind: "service",
    category: "service",
    facilities: ["Skrivare"],
    lokaltyp: ["Service"],
    sort_order: 21,
  },
  {
    ...baseSpace,
    id: "20000000-0000-4000-8000-000000000001",
    slug: "makerspace",
    name: "Makerspace",
    name_en: "Makerspace",
    space_kind: "creative",
    category: "creative",
    equipment: ["Verktyg"],
    lokaltyp: ["Skapande"],
    sort_order: 30,
  },
];

const spaces = [...studySpaces, ...otherSpaces];

const filterCategories = [
  {
    id: "category-space-kind",
    key: "space_kind",
    title: "Vad letar du efter?",
    title_en: "What are you looking for?",
    style: "pills",
    match_mode: "any",
    is_single_select: true,
    locked: true,
    sort_order: 0,
    special_kind: "space_kind",
  },
  {
    id: "category-work-mode",
    key: "arbetssatt",
    title: "Hur vill du arbeta?",
    title_en: "How do you want to work?",
    style: "pills",
    match_mode: "any",
    is_single_select: true,
    locked: true,
    sort_order: 1,
    special_kind: "arbetssatt",
  },
  {
    id: "category-noise",
    key: "noise",
    title: "Ljudnivå",
    title_en: "Noise level",
    style: "list",
    match_mode: "any",
    is_single_select: false,
    locked: true,
    sort_order: 2,
    special_kind: null,
  },
];

const filterOptions = [
  ["space_kind", "Studieplatser", "Study spaces", "study", 0],
  ["space_kind", "Service", "Library services", "service", 1],
  ["space_kind", "Skapa och pausa", "Create and take a break", "creative", 2],
  ["arbetssatt", "Enskilt", "Alone", "enskilt", 0],
  ["arbetssatt", "Tillsammans", "Together", "tillsammans", 1],
  ["arbetssatt", "I grupprum", "In a group room", "grupprum", 2],
  ["noise", "Tyst", "Quiet", "Tyst", 0],
  ["noise", "Samtal tillåtet", "Conversation allowed", "Samtal tillåtet", 1],
].map(([category, label, label_en, value_key, sort_order], index) => ({
  id: `option-${index}`,
  category,
  label,
  label_en,
  icon_url: null,
  default_icon: null,
  sort_order,
  value_key,
  is_seed: true,
  hidden: false,
}));

const appSettings = [
  { key: "card_section_order", value: ["info", "description", "booking"] },
  { key: "hidden_icons", value: [] },
  { key: "announcements", value: [] },
];

function json(response, status, body, count) {
  response.writeHead(status, {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Expose-Headers": "Content-Range",
    "Content-Type": "application/json",
    ...(typeof count === "number"
      ? { "Content-Range": count === 0 ? "*/0" : `0-${count - 1}/${count}` }
      : {}),
  });
  response.end(JSON.stringify(body));
}

function requestedSetting(url) {
  const keyFilter = url.searchParams.get("key");
  if (!keyFilter?.startsWith("eq.")) return null;
  const key = decodeURIComponent(keyFilter.slice(3));
  return appSettings.find((setting) => setting.key === key) ?? null;
}

const server = createServer((request, response) => {
  const url = new URL(request.url ?? "/", `http://127.0.0.1:${port}`);

  if (request.method === "OPTIONS") {
    response.writeHead(204, {
      "Access-Control-Allow-Headers": "*",
      "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
      "Access-Control-Allow-Origin": "*",
    });
    response.end();
    return;
  }

  if (url.pathname === "/health") {
    json(response, 200, { ok: true });
    return;
  }

  if (!url.pathname.startsWith("/rest/v1/")) {
    json(response, 404, { message: "Not found" });
    return;
  }

  if (request.method !== "GET") {
    json(response, request.method === "POST" ? 201 : 200, []);
    return;
  }

  const table = url.pathname.slice("/rest/v1/".length);
  const acceptsObject = request.headers.accept?.includes("vnd.pgrst.object");

  if (table === "spaces") {
    json(response, 200, spaces, spaces.length);
    return;
  }

  if (table === "filter_categories") {
    json(response, 200, filterCategories, filterCategories.length);
    return;
  }

  if (table === "filter_options") {
    json(response, 200, filterOptions, filterOptions.length);
    return;
  }

  if (table === "app_settings") {
    const setting = requestedSetting(url);
    if (acceptsObject) {
      json(response, 200, setting ?? {});
    } else {
      const rows = setting ? [setting] : appSettings;
      json(response, 200, rows, rows.length);
    }
    return;
  }

  json(response, 200, [], 0);
});

server.listen(port, "127.0.0.1");

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    server.close(() => process.exit(0));
  });
}
