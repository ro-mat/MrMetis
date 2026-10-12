import { defaultPreferences } from "helpers/localeHelper";
import { toCsv, toJson } from "helpers/exportHelper";
import { parseCsv } from "helpers/csvHelper";
import { IMPORTERS, ImportError } from "helpers/importers";
import { prepareImport } from "helpers/importHelper";
import { getData } from "helpers/demoData";
import reducer, {
  IMPORT_DATA,
  SET_USERDATA,
} from "store/userdata/userdata.slice";
import "locales/i18n";
import {
  BudgetTypeUser,
  IUserdata,
  IUserdataDto,
} from "store/userdata/userdata.types";

const mrmetis = IMPORTERS[0];

const userdata = (): IUserdata => ({
  accounts: [
    {
      id: 1,
      name: "Наличные",
      dateCreated: "2026-01-01",
      leftFromPrevMonth: [{ month: "2026-01-01", amount: 10, accountId: 1 }],
    },
  ],
  budgets: [
    {
      id: 2,
      name: "Food",
      dateCreated: "2026-01-01",
      toAccountId: 1,
      isEssential: true,
      amounts: [
        {
          expression: [{ kind: "number", value: 100 }],
          fromAccountId: 1,
          frequency: 1,
          startDate: "2026-01-01",
        },
      ],
      overrides: [],
      type: BudgetTypeUser.spending,
      closeAfterOneStatement: false,
    },
    {
      id: 3,
      name: "Groceries",
      parentId: 2,
      dateCreated: "2026-01-01",
      toAccountId: 1,
      isEssential: false,
      amounts: [],
      overrides: [],
      type: BudgetTypeUser.spending,
      closeAfterOneStatement: false,
    },
  ],
  statements: [
    {
      id: 4,
      amount: -12.5,
      comment: 'milk, "fresh"\nbread',
      date: "2026-02-03",
      budgetId: 2,
      accountId: 1,
      dateCreated: "2026-02-03",
    },
  ],
  preferences: defaultPreferences(),
  closedMonths: [],
});

describe("csv parsing", () => {
  it("reads quoted cells, line breaks and a BOM", () => {
    expect(parseCsv('﻿a,b\r\n"x, ""y""\nz",\r\n\r\n')).toEqual([
      ["a", "b"],
      ['x, "y"\nz', ""],
    ]);
  });
});

describe("mrmetis import", () => {
  it.each(["statements", "budgets", "accounts"] as const)(
    "reads back exported %s, csv and json",
    (entity) => {
      const data = userdata();
      for (const text of [toCsv(data, entity), toJson(data, entity)]) {
        const imported = mrmetis.parse(text);
        expect(imported.entity).toBe(entity);
        expect(imported.items).toEqual(data[entity]);
      }
    }
  );

  it("reads a csv with a BOM", () => {
    const imported = mrmetis.parse("﻿" + toCsv(userdata(), "accounts"));
    expect(imported.items).toHaveLength(1);
  });

  it("refuses other files", () => {
    const fails = (text: string, key: string) =>
      expect(() => mrmetis.parse(text)).toThrow(new ImportError(key));
    fails("date,amount\n2026-01-01,1", "preferences.importNotMrmetis");
    fails(
      '{"app":"other","entity":"budgets","items":[]}',
      "preferences.importNotMrmetis"
    );
    fails("{not json", "preferences.importInvalid");
    fails(
      '{"app":"mrmetis","entity":"accounts","items":[{"id":"x"}]}',
      "preferences.importInvalid"
    );
  });
});

describe("importing stored data", () => {
  // the demo data is shaped like stored data: it leaves out fields its
  // types require (e.g. the account of an amount)
  const stored = reducer(
    undefined,
    SET_USERDATA(getData() as unknown as IUserdataDto)
  ).userdata;

  it.each(["statements", "budgets", "accounts"] as const)(
    "%s export back without skipping",
    (entity) => {
      for (const text of [toCsv(stored, entity), toJson(stored, entity)]) {
        const { prepared, skipped } = prepareImport(
          stored,
          mrmetis.parse(text)
        );
        expect(skipped).toBe(0);
        expect(prepared.items).toHaveLength(stored[entity].length);
      }
    }
  );

  it("reads null as not set", () => {
    const budget = { ...stored.budgets[0], parentId: null, closed: null };
    const imported = mrmetis.parse(
      JSON.stringify({ app: "mrmetis", entity: "budgets", items: [budget] })
    );
    expect(imported.items[0]).not.toHaveProperty("parentId", null);
    expect(imported.items[0]).not.toHaveProperty("closed", null);
  });
});

describe("preferences", () => {
  const prefs = (): IUserdata["preferences"] => ({
    ...defaultPreferences(),
    locale: { country: "DE", thousandsSeparator: "", firstDayOfWeek: 0 },
    language: "ru",
    currency: {
      symbol: "€",
      position: "before",
      decimals: 0,
      negativeStyle: "parentheses",
    },
    idleTimeoutMinutes: 30,
  });

  it('read back from csv and json, a "" separator too', () => {
    const data = { ...userdata(), preferences: prefs() };
    for (const text of [
      toCsv(data, "preferences"),
      toJson(data, "preferences"),
    ]) {
      expect(mrmetis.parse(text)).toEqual({
        entity: "preferences",
        items: [prefs()],
      });
    }
  });

  it("replace the current ones, missing values are the defaults", () => {
    let s = reducer(undefined, SET_USERDATA({ preferences: prefs() }));
    s = reducer(
      s,
      IMPORT_DATA(
        mrmetis.parse(
          JSON.stringify({
            app: "mrmetis",
            entity: "preferences",
            items: [{ theme: "dark" }],
          })
        )
      )
    );
    expect(s.userdata.preferences).toEqual({
      ...defaultPreferences(),
      theme: "dark",
    });
  });

  it("refuses invalid values and more than one item", () => {
    const fails = (items: unknown[]) =>
      expect(() =>
        mrmetis.parse(
          JSON.stringify({ app: "mrmetis", entity: "preferences", items })
        )
      ).toThrow(new ImportError("preferences.importInvalid"));
    fails([{ theme: "pink" }]);
    fails([{}, {}]);
  });
});

describe("prepareImport", () => {
  it("adds statements with new ids, also to closed months, skipping missing links", () => {
    const data = userdata();
    data.closedMonths = ["2026-01-01"];
    const { items } = mrmetis.parse(
      toJson(
        {
          ...data,
          statements: [
            data.statements[0],
            { ...data.statements[0], id: 5, accountId: 99 },
            { ...data.statements[0], id: 6, date: "2026-01-15" },
          ],
        },
        "statements"
      )
    ) as { items: IUserdata["statements"] };

    const { prepared, skipped } = prepareImport(data, {
      entity: "statements",
      items,
    });
    expect(skipped).toBe(1);
    expect(prepared.items).toEqual([
      expect.objectContaining({ id: 5, date: "2026-02-03", accountId: 1 }),
      expect.objectContaining({ id: 6, date: "2026-01-15", accountId: 1 }),
    ]);
  });

  it("links budget parents of the file to their new ids", () => {
    const data = userdata();
    const { prepared } = prepareImport(
      data,
      mrmetis.parse(toCsv(data, "budgets"))
    );
    const budgets = prepared.items as IUserdata["budgets"];
    expect(budgets.map((b) => b.id)).toEqual([4, 5]);
    expect(budgets.map((b) => b.parentId)).toEqual([undefined, 4]);
  });

  it("moves an account's own amounts to its new id", () => {
    const data = userdata();
    const { prepared } = prepareImport(
      data,
      mrmetis.parse(toCsv(data, "accounts"))
    );
    expect(prepared.items).toEqual([
      expect.objectContaining({
        id: 2,
        leftFromPrevMonth: [{ month: "2026-01-01", amount: 10, accountId: 2 }],
      }),
    ]);
  });
});
