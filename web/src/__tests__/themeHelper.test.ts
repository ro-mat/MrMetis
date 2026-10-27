import { applyStoredTheme, applyTheme, storeTheme } from "helpers/themeHelper";

describe("theme", () => {
  const root = document.documentElement;

  beforeEach(() => {
    root.className = "";
    localStorage.clear();
  });

  it("puts the chosen theme on <html>, none for auto", () => {
    applyTheme("dark");
    expect(root.classList.contains("dark")).toBe(true);
    expect(root.classList.contains("light")).toBe(false);

    applyTheme("light");
    expect(root.classList.contains("light")).toBe(true);
    expect(root.classList.contains("dark")).toBe(false);

    applyTheme("auto");
    expect(root.className).toBe("");
  });

  it("applies the theme stored on this device", () => {
    storeTheme("dark");
    applyStoredTheme();
    expect(root.classList.contains("dark")).toBe(true);
  });
});
