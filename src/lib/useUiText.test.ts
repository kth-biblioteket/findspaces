import { describe, expect, test } from "vitest";
import { resolveUiText, UI_TEXT_DEFAULTS, UI_TEXT_DEFAULTS_EN, type UiSettings } from "./useUiText";

describe("resolveUiText", () => {
  test("uses admin-edited Swedish and English page titles", () => {
    const settings: UiSettings = {
      "ui_text:landing_title": "Svensk rubrik",
      "ui_text:en:landing_title": "English title",
    };

    expect(resolveUiText(settings, "landing_title", "sv")).toBe("Svensk rubrik");
    expect(resolveUiText(settings, "landing_title", "en")).toBe("English title");
  });

  test("falls back safely when settings rows are missing", () => {
    expect(resolveUiText({}, "landing_title", "sv")).toBe(UI_TEXT_DEFAULTS.landing_title);
    expect(resolveUiText({}, "landing_title", "en")).toBe(UI_TEXT_DEFAULTS_EN.landing_title);
  });

  test("keeps the existing English-to-Swedish admin fallback", () => {
    const settings: UiSettings = {
      "ui_text:landing_body": "Svensk redaktionell text",
      "ui_text:en:landing_body": "   ",
    };

    expect(resolveUiText(settings, "landing_body", "en")).toBe("Svensk redaktionell text");
  });
});
