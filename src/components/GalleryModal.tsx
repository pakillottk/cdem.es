import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import ImageGallery from "react-image-gallery";
import "react-image-gallery/styles/image-gallery.css";

interface GalleryImage {
  original: string;
  thumbnail: string;
  originalAlt?: string;
}

interface GalleryModalProps {
  coverSrc: string;
  coverAlt: string;
  images: GalleryImage[];
}

export default function GalleryModal({
  coverSrc,
  coverAlt,
  images,
}: GalleryModalProps) {
  const [open, setOpen] = useState(false);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, close]);

  return (
    <>
      <div
        onClick={() => setOpen(true)}
        className="producciones-grid__image gallery-trigger"
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && setOpen(true)}
      >
        <img src={coverSrc} alt={coverAlt} />
      </div>

      {open &&
        createPortal(
          <div className="gallery-overlay" onClick={close}>
            <div
              className="gallery-container"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={close}
                className="gallery-close"
                aria-label="Cerrar galería"
              >
                ✕
              </button>
              <ImageGallery
                items={images}
                showPlayButton={false}
                showFullscreenButton={true}
                showThumbnails={true}
                lazyLoad={true}
                slideDuration={300}
              />
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
