import { Theme } from "store/userdata/userdata.types";

// The last applied theme, so a reload (and the pages before login) show it
// before the stored preferences load.
export const ThemeKey = "theme";

// header colors (--brand-bg in styles/_theme.scss), for the browser's UI
const THEME_COLORS = { light: "#91f9e5", dark: "#0f4a50" };

// <html> gets .light or .dark; with neither ("auto") the OS setting decides
export const applyTheme = (theme: Theme) => {
  const root = document.documentElement;
  root.classList.toggle("light", theme === "light");
  root.classList.toggle("dark", theme === "dark");

  // index.html has one tag per OS setting; a chosen theme sets both
  document
    .querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')
    .forEach((meta) => {
      const scheme = meta.media.includes("dark") ? "dark" : "light";
      meta.content = THEME_COLORS[theme === "auto" ? scheme : theme];
    });
};

export const storeTheme = (theme: Theme) => {
  try {
    localStorage.setItem(ThemeKey, theme);
  } catch {
    // storage blocked: the theme just isn't remembered
  }
};

export const applyStoredTheme = () => {
  try {
    const theme = localStorage.getItem(ThemeKey);
    if (theme === "light" || theme === "dark") applyTheme(theme);
  } catch {
    // storage blocked: the OS setting decides
  }
};
