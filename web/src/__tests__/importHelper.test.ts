import { defaultPreferences } from "helpers/localeHelper";
import { toCsv, toJson, toJsonAll } from "helpers/exportHelper";
import { parseCsv } from "helpers/csvHelper";
import { IMPORTERS, Imported, ImportError } from "helpers/importers";
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

// the items of a file of one kind (not all data)
const itemsOf = (imported: Imported) => {
  if (imported.entity === "all") throw new Error("all data has no items");
  return imported.items;
};

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
        expect(itemsOf(imported)).toEqual(data[entity]);
      }
    }
  );

  it("reads a csv with a BOM", () => {
    const imported = mrmetis.parse("﻿" + toCsv(userdata(), "accounts"));
    expect(itemsOf(imported)).toHaveLength(1);
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
        expect(itemsOf(prepared)).toHaveLength(stored[entity].length);
      }
    }
  );

  it("reads null as not set", () => {
    const budget = { ...stored.budgets[0], parentId: null, closed: null };
    const imported = mrmetis.parse(
      JSON.stringify({ app: "mrmetis", entity: "budgets", items: [budget] })
    );
    expect(itemsOf(imported)[0]).not.toHaveProperty("parentId", null);
    expect(itemsOf(imported)[0]).not.toHaveProperty("closed", null);
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
    expect(itemsOf(prepared)).toEqual([
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
    const budgets = itemsOf(prepared) as IUserdata["budgets"];
    expect(budgets.map((b) => b.id)).toEqual([4, 5]);
    expect(budgets.map((b) => b.parentId)).toEqual([undefined, 4]);
  });

  it("moves an account's own amounts to its new id", () => {
    const data = userdata();
    const { prepared } = prepareImport(
      data,
      mrmetis.parse(toCsv(data, "accounts"))
    );
    expect(itemsOf(prepared)).toEqual([
      expect.objectContaining({
        id: 2,
        leftFromPrevMonth: [{ month: "2026-01-01", amount: 10, accountId: 2 }],
      }),
    ]);
  });
});

describe("overwriting", () => {
  it("keeps the file's ids and dates, skipping missing links", () => {
    const data = userdata();
    const items = [
      { ...data.statements[0], id: 1 },
      { ...data.statements[0], id: 7, accountId: 99 },
    ];
    const { prepared, skipped } = prepareImport(
      data,
      { entity: "statements", items },
      "overwrite"
    );
    expect(skipped).toBe(1);
    expect(itemsOf(prepared)).toEqual([items[0]]);
  });

  it("drops a budget parent that isn't in the file", () => {
    const data = userdata();
    const { prepared } = prepareImport(
      data,
      { entity: "budgets", items: [data.budgets[1]] },
      "overwrite"
    );
    expect(itemsOf(prepared)).toEqual([
      expect.objectContaining({ id: 3, parentId: undefined }),
    ]);
  });

  it("replaces every current item of the kind", () => {
    let s = reducer(undefined, SET_USERDATA(userdata()));
    const account = { ...userdata().accounts[0], id: 5, name: "Card" };
    s = reducer(
      s,
      IMPORT_DATA({ entity: "accounts", items: [account], overwrite: true })
    );
    expect(s.userdata.accounts).toEqual([account]);
    // other kinds stay
    expect(s.userdata.budgets).toHaveLength(2);
  });
});

describe("all data", () => {
  it("exports and imports back in place of everything", () => {
    const data = { ...userdata(), closedMonths: ["2026-01-01"] };
    const imported = mrmetis.parse(toJsonAll(data));
    expect(imported).toEqual({ entity: "all", data });

    let s = reducer(
      undefined,
      SET_USERDATA({ accounts: [{ ...data.accounts[0], id: 9 }] })
    );
    s = reducer(s, IMPORT_DATA({ ...imported, overwrite: true }));
    expect(s.userdata).toEqual(data);
  });

  it("refuses a file missing a kind", () => {
    const text = JSON.stringify({
      app: "mrmetis",
      entity: "all",
      data: { accounts: [], budgets: [], preferences: {} },
    });
    expect(() => mrmetis.parse(text)).toThrow("preferences.importInvalid");
  });
});
