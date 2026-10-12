import { defaultPreferences } from "helpers/localeHelper";
import { toCsv, toJson } from "helpers/exportHelper";
import { parseCsv } from "helpers/csvHelper";
import { IMPORTERS, ImportError } from "helpers/importers";
import { prepareImport } from "helpers/importHelper";
import { BudgetTypeUser, IUserdata } from "store/userdata/userdata.types";

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
          amount: "100",
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
    expect(prepared.items.map((b) => b.id)).toEqual([4, 5]);
    expect(
      (prepared.items as IUserdata["budgets"]).map((b) => b.parentId)
    ).toEqual([undefined, 4]);
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
