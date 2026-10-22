import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const siteName = "MrMetis";

// sets the tab title, the description search engines show and the canonical url; index.html holds the defaults
const usePageMeta = (title?: string, description?: string) => {
  const { pathname } = useLocation();

  useEffect(() => {
    const meta = document.querySelector<HTMLMetaElement>(
      'meta[name="description"]',
    );
    const canonical = document.querySelector<HTMLLinkElement>(
      'link[rel="canonical"]',
    );
    const prevTitle = document.title;
    const prevDescription = meta?.content;
    const prevCanonical = canonical?.href;

    if (title) document.title = `${title} · ${siteName}`;
    if (meta && description) meta.content = description;
    // keeps the production origin from index.html, whichever host serves the page
    if (canonical) canonical.href = new URL(pathname, canonical.href).href;

    // pages without their own meta fall back to the defaults
    return () => {
      document.title = prevTitle;
      if (meta && prevDescription !== undefined) meta.content = prevDescription;
      if (canonical && prevCanonical !== undefined)
        canonical.href = prevCanonical;
    };
  }, [title, description, pathname]);
};

export default usePageMeta;
