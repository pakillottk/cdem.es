import manifest from "./galleryManifest.generated";

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

function buildImagesFromManifest(
  folder: string,
  alt: string,
): GalleryImage[] {
  const entries = manifest[folder] ?? [];
  return entries.map((entry) => ({
    original: encodeURI(`/producciones/${folder}/${entry.full}`),
    thumbnail: encodeURI(`/producciones/${folder}/${entry.thumb}`),
    originalAlt: alt,
  }));
}

const productions: Production[] = [
  {
    name: "Vive Linares",
    coverSrc: "/producciones/portada vive Linares2.webp",
    images: buildImagesFromManifest("ViveLinares", "Vive Linares"),
  },
  {
    name: "Festival de Jazz",
    coverSrc: "/producciones/portada festival jazz.webp",
    images: buildImagesFromManifest("FestivalJazz", "Festival de Jazz"),
  },
  {
    name: "New Wave",
    coverSrc: "/producciones/portada New Wave2.webp",
    images: buildImagesFromManifest("NewWave", "New Wave"),
  },
  {
    name: "Ibero Joven",
    coverSrc: "/producciones/portada ibero joven.webp",
    images: buildImagesFromManifest("IberoJoven", "Ibero Joven"),
  },
  {
    name: "JC Reyes",
    coverSrc: "/producciones/PORTADA jc reyes.webp",
    images: buildImagesFromManifest("JCReyes", "JC Reyes"),
  },
  {
    name: "Joaquín Sabina",
    coverSrc: "/producciones/PORTADA Joaquín Sabina.webp",
    images: buildImagesFromManifest("JoaquinSabina", "Joaquín Sabina"),
  },
  {
    name: "Panorama",
    coverSrc: "/producciones/PORTADA Panorama.webp",
    images: buildImagesFromManifest("Panorama", "Panorama"),
  },
  {
    name: "Quevedo",
    coverSrc: "/producciones/PORTADA quevedo.webp",
    images: buildImagesFromManifest("Quevedo", "Quevedo"),
  },
  {
    name: "Raphael",
    coverSrc: "/producciones/PORTADA Raphael.webp",
    images: buildImagesFromManifest("Raphael", "Raphael"),
  },
];

export { productions };
