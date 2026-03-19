export interface GalleryImage {
  original: string;
  thumbnail: string;
  originalAlt?: string;
}

export interface Production {
  name: string;
  coverSrc: string;
  images: GalleryImage[];
}

function buildImages(folder: string, count: number, alt: string): GalleryImage[] {
  return Array.from({ length: count }, (_, i) => ({
    original: `/producciones/${folder}/${i + 1}.jpg`,
    thumbnail: `/producciones/${folder}/${i + 1}.jpg`,
    originalAlt: alt,
  }));
}

const productions: Production[] = [
  {
    name: "Vive Linares",
    coverSrc: "/producciones/portada vive Linares2.jpg",
    images: buildImages("ViveLinares", 29, "Vive Linares"),
  },
  {
    name: "Festival de Jazz",
    coverSrc: "/producciones/portada festival jazz.jpg",
    images: buildImages("FestivalJazz", 8, "Festival de Jazz"),
  },
  {
    name: "New Wave",
    coverSrc: "/producciones/portada New Wave2.jpg",
    images: buildImages("NewWave", 21, "New Wave"),
  },
];

export { productions };
