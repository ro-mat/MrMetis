import moment from "moment";
import i18n from "locales/i18n";
import { formatInLanguage } from "helpers/dateHelper";
import {
  createFormatter,
  defaultPreferences,
  detectCountry,
  getCountryPreset,
  resolveLocale,
  withDefaults,
} from "helpers/localeHelper";
import userdataReducer, {
  SET_USERDATA,
  UPDATE_PREFERENCES,
} from "store/userdata/userdata.slice";
import { IPreferences } from "store/userdata/userdata.types";

const prefs = (
  locale: Partial<IPreferences["locale"]>,
  currency: Partial<IPreferences["currency"]> = {}
): IPreferences => {
  const defaults = defaultPreferences();
  return {
    ...defaults,
    locale: { ...defaults.locale, ...locale },
    currency: { ...defaults.currency, ...currency },
  };
};

describe("localeHelper", () => {
  it.each([
    ["DE", "DMY", ".", ",", ".", 1],
    ["US", "MDY", "/", ".", ",", 0],
    ["RU", "DMY", ".", ",", " ", 1],
    ["GB", "DMY", "/", ".", ",", 1],
  ])(
    "%s preset: %s with '%s', decimal '%s', group '%s', week from %i",
    (country, order, dateSep, decimal, group, firstDay) => {
      expect(getCountryPreset(country)).toEqual({
        dateOrder: order,
        dateSeparator: dateSep,
        decimalSeparator: decimal,
        thousandsSeparator: group,
        firstDayOfWeek: firstDay,
      });
    }
  );

  it("overrides win over the country's values", () => {
    const locale = resolveLocale({
      country: "DE",
      dateOrder: "YMD",
      dateSeparator: "-",
      decimalSeparator: undefined,
      firstDayOfWeek: 0,
    });
    expect(locale.decimalSeparator).toBe(",");
    expect(locale.firstDayOfWeek).toBe(0);
    expect(locale.momentDate).toBe("YYYY-MM-DD");
    expect(locale.momentMonth).toBe("YYYY-MM");
    expect(locale.pickerDate).toBe("yyyy-MM-dd");
  });

  it("formats dates and months in the user's order", () => {
    const { formatDate, formatMonth } = createFormatter(prefs({ country: "DE" }));
    expect(formatDate("2026-01-31")).toBe("31.01.2026");
    expect(formatMonth("2026-01-31")).toBe("01.2026");
  });

  it("formats amounts with the currency settings", () => {
    const de = createFormatter(prefs({ country: "DE" }));
    expect(de.formatAmount(1234567.891)).toBe("1.234.567,89");
    expect(de.formatAmount(-0.001)).toBe("0,00");

    const euro = createFormatter(
      prefs({ country: "DE" }, { symbol: "€", negativeStyle: "parentheses" })
    );
    expect(euro.formatAmount(-1234.5)).toBe("(1.234,50 €)");

    const dollar = createFormatter(
      prefs({ country: "US" }, { symbol: "$", position: "before", decimals: 0 })
    );
    expect(dollar.formatAmount(-1234.5)).toBe("-$1,235");
  });

  it.each([
    ["DE", "1.234,5", 1234.5],
    ["DE", "12,5", 12.5],
    ["DE", "-7", -7],
    ["US", "1,234.5", 1234.5],
    ["RU", "1 234,5", 1234.5],
    ["US", "", undefined],
    ["US", "abc", NaN],
    ["US", "1.2.3", NaN],
  ])("%s parses '%s'", (country, text, expected) => {
    expect(createFormatter(prefs({ country })).parseAmount(text)).toBe(expected);
  });

  it("parses what it formats", () => {
    for (const country of ["DE", "US", "RU", "CH", "FR"]) {
      const { formatNumber, parseAmount } = createFormatter(prefs({ country }));
      expect(parseAmount(formatNumber(-1234567.25))).toBe(-1234567.25);
    }
  });

  it("parses dates in the user's format or ISO", () => {
    const { parseDate } = createFormatter(prefs({ country: "DE" }));
    expect(parseDate("31.01.2026")?.isSame(moment("2026-01-31"), "d")).toBe(true);
    expect(parseDate("2026-01-31")?.isSame(moment("2026-01-31"), "d")).toBe(true);
    expect(parseDate("12")).toBeUndefined();
  });

  it("takes the country from the browser's languages", () => {
    expect(detectCountry(["de-AT", "en-US"])).toBe("AT");
    expect(detectCountry(["fr", "en-US"])).toBe("US");
    expect(detectCountry(["de"])).toBe("DE");
    expect(detectCountry([])).toBe("US");
  });

  it("fills in missing preferences", () => {
    const filled = withDefaults({ locale: { country: "DE" } } as IPreferences);
    expect(filled.locale.country).toBe("DE");
    expect(filled.currency.decimals).toBe(2);
    expect(filled.idleTimeoutMinutes).toBe(10);
  });
});

describe("preferences in the store", () => {
  it("older data without preferences gets the defaults", () => {
    const state = userdataReducer(undefined, SET_USERDATA({ statements: [] }));
    expect(state.userdata.preferences).toEqual(defaultPreferences());
  });

  it("changing preferences saves them", () => {
    const loaded = userdataReducer(undefined, SET_USERDATA({}));
    const state = userdataReducer(loaded, UPDATE_PREFERENCES({ idleTimeoutMinutes: 30 }));
    expect(state.userdata.preferences.idleTimeoutMinutes).toBe(30);
    expect(state.userdata.preferences.currency.decimals).toBe(2);
    expect(state.savePending).toBe(true);
  });
});

describe("date names", () => {
  afterAll(() => i18n.changeLanguage("en"));

  it("month and day names follow the app's language", async () => {
    // made before the switch, as memoized months are
    const date = moment("2026-01-05");

    await i18n.changeLanguage("ru");
    expect(moment("2026-01-05").format("MMMM dddd")).toBe("январь понедельник");
    expect(formatInLanguage(date, "MMM dddd")).toBe("янв. понедельник");

    await i18n.changeLanguage("en");
    expect(formatInLanguage(date, "MMMM dddd")).toBe("January Monday");
  });
});
