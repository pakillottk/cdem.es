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
    original: `/Producciones/${folder}/${i + 1}.jpg`,
    thumbnail: `/Producciones/${folder}/${i + 1}.jpg`,
    originalAlt: alt,
  }));
}

export const productions: Production[] = [
  {
    name: "Vive Linares",
    coverSrc: "/portada vive Linares2.jpg",
    images: buildImages("ViveLinares", 29, "Vive Linares"),
  },
  {
    name: "Festival de Jazz",
    coverSrc: "/portada festival jazz.jpg",
    images: buildImages("FestivalJazz", 8, "Festival de Jazz"),
  },
  {
    name: "New Wave",
    coverSrc: "/portada New Wave2.jpg",
    images: buildImages("NewWave", 21, "New Wave"),
  },
];
