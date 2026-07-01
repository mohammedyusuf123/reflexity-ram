import { useEffect, useState } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

export default function ImageModal({ open, images, startIndex = 0, onClose, alt }) {
  const [idx, setIdx] = useState(startIndex);

  useEffect(() => {
    setIdx(startIndex);
  }, [startIndex, open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") setIdx((i) => (i + 1) % images.length);
      if (e.key === "ArrowLeft") setIdx((i) => (i - 1 + images.length) % images.length);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, images, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-md flex items-center justify-center p-4"
      onClick={onClose}
      data-testid="image-modal"
    >
      <button
        className="absolute top-5 right-5 w-11 h-11 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white"
        onClick={onClose}
        data-testid="image-modal-close"
      >
        <X size={18} />
      </button>

      {images.length > 1 && (
        <button
          className="absolute left-4 md:left-8 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white"
          onClick={(e) => {
            e.stopPropagation();
            setIdx((i) => (i - 1 + images.length) % images.length);
          }}
          data-testid="image-modal-prev"
        >
          <ChevronLeft size={20} />
        </button>
      )}

      <img
        src={images[idx]}
        alt={alt}
        className="max-h-[88vh] max-w-[92vw] object-contain rounded-lg"
        onClick={(e) => e.stopPropagation()}
        data-testid="image-modal-image"
      />

      {images.length > 1 && (
        <button
          className="absolute right-4 md:right-8 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white"
          onClick={(e) => {
            e.stopPropagation();
            setIdx((i) => (i + 1) % images.length);
          }}
          data-testid="image-modal-next"
        >
          <ChevronRight size={20} />
        </button>
      )}

      <div className="absolute bottom-6 left-0 right-0 flex justify-center mono text-[11px] text-neutral-400">
        {idx + 1} / {images.length}
      </div>
    </div>
  );
}
