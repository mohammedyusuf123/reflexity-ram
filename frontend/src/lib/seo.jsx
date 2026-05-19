import { useEffect } from "react";

export function useSEO({ title, description }) {
  useEffect(() => {
    const fullTitle = title
      ? `${title} — Reflexity RAM`
      : "Reflexity RAM — Memory, made accessible.";
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
  }, [title, description]);
}
