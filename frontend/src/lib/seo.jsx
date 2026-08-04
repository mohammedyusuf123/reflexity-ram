import { useEffect } from "react";

export function useSEO({ title, description }) {
  useEffect(() => {
    const fullTitle = title
      ? title.endsWith("Reflexity RAM") ? title : `${title} — Reflexity RAM`
      : "Tested DDR4 & DDR5 RAM in Canada — Reflexity RAM";
    document.title = fullTitle;

    if (description) {
      let meta = document.querySelector('meta[name="description"]');
      if (!meta) {
        meta = document.createElement("meta");
        meta.setAttribute("name", "description");
        document.head.appendChild(meta);
      }
      meta.setAttribute("content", description);

      let og = document.querySelector('meta[property="og:description"]');
      if (og) og.setAttribute("content", description);
    }

    let ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute("content", fullTitle);

    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    canonical.setAttribute("href", `${window.location.origin}${window.location.pathname}`);

    let ogUrl = document.querySelector('meta[property="og:url"]');
    if (!ogUrl) {
      ogUrl = document.createElement("meta");
      ogUrl.setAttribute("property", "og:url");
      document.head.appendChild(ogUrl);
    }
    ogUrl.setAttribute("content", `${window.location.origin}${window.location.pathname}`);
  }, [title, description]);
}
