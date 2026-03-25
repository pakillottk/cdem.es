import { Navigation, Pagination } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";

import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";

export type BookingSlide =
  | { kind: "image"; src: string; alt: string }
  | { kind: "pdf"; href: string; src: string; alt: string };

type Props = {
  slides: BookingSlide[];
};

function SlideCard({ slide }: { slide: BookingSlide }) {
  const img = (
    <img src={slide.src} alt={slide.alt} loading="lazy" decoding="async" />
  );

  if (slide.kind === "pdf") {
    return (
      <article className="booking-grid__item h-full">
        <a
          href={slide.href}
          target="_blank"
          rel="noopener noreferrer"
          className="block"
        >
          {img}
        </a>
      </article>
    );
  }

  return <article className="booking-grid__item h-full">{img}</article>;
}

export default function BookingGridSwiper({ slides }: Props) {
  return (
    <>
      <div className="booking-grid__list">
        {slides.map((slide, i) => (
          <SlideCard key={`grid-${i}`} slide={slide} />
        ))}
      </div>

      <div className="booking-grid__swiper-wrap">
        <div className="booking-swiper-shell">
          {/*
            Paginación fuera del .booking-swiper: así el contenedor solo mide
            la altura de las slides y las flechas (absolute + top 50%) quedan
            centradas en la imagen.
          */}
          <Swiper
            modules={[Pagination, Navigation]}
            slidesPerView={1}
            spaceBetween={24}
            pagination={{
              clickable: true,
              el: "#booking-swiper-pagination",
            }}
            navigation
            breakpoints={{
              768: {
                slidesPerView: 2,
                spaceBetween: 32,
              },
            }}
            className="booking-swiper"
          >
            {slides.map((slide, i) => (
              <SwiperSlide key={`sw-${i}`}>
                <SlideCard slide={slide} />
              </SwiperSlide>
            ))}
          </Swiper>
          <div
            id="booking-swiper-pagination"
            className="swiper-pagination booking-swiper-pagination-below"
          />
        </div>
      </div>
    </>
  );
}
