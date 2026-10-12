import { defaultPreferences } from "helpers/localeHelper";
import { APP_CODE, csvCell, toCsv, toJson } from "helpers/exportHelper";
import { BudgetTypeUser, IUserdata } from "store/userdata/userdata.types";

const userdata: IUserdata = {
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
  ],
  statements: [
    {
      id: 3,
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
};

describe("export", () => {
  it("escapes csv cells", () => {
    expect(csvCell(undefined)).toBe("");
    expect(csvCell(1.5)).toBe("1.5");
    expect(csvCell("plain")).toBe("plain");
    expect(csvCell('a,"b"')).toBe('"a,""b"""');
    expect(csvCell("a\nb")).toBe('"a\nb"');
  });

  it("statements csv has the app code and resolved names", () => {
    expect(toCsv(userdata, "statements").split("\r\n")).toEqual([
      "app,id,date,amount,comment,accountId,account,budgetId,budget,dateCreated,dateModified",
      `${APP_CODE},3,2026-02-03,-12.5,"milk, ""fresh""\nbread",1,Наличные,2,Food,2026-02-03,`,
    ]);
  });

  it("budgets csv keeps nested lists as json", () => {
    const [header, row] = toCsv(userdata, "budgets").split("\r\n");
    expect(header.startsWith("app,id,name,type,")).toBe(true);
    expect(row.startsWith(`${APP_CODE},2,Food,spending,,,1,true,false,`)).toBe(
      true
    );
    expect(row).toContain(csvCell(JSON.stringify(userdata.budgets[0].amounts)));
  });

  it("accounts csv", () => {
    expect(toCsv(userdata, "accounts").split("\r\n")).toEqual([
      "app,id,name,leftFromPrevMonth,dateCreated,dateModified",
      `${APP_CODE},1,Наличные,${csvCell(
        JSON.stringify(userdata.accounts[0].leftFromPrevMonth)
      )},2026-01-01,`,
    ]);
  });

  it("json has the app code and the items", () => {
    const json = JSON.parse(toJson(userdata, "budgets"));
    expect(json.app).toBe(APP_CODE);
    expect(json.entity).toBe("budgets");
    expect(json.items).toEqual(userdata.budgets);
    expect(typeof json.exportedAt).toBe("string");
  });
});
