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
  const files = manifest[folder] ?? [];
  return files.map((file) => {
    const src = encodeURI(`/producciones/${folder}/${file}`);
    return {
      original: src,
      thumbnail: src,
      originalAlt: alt,
    };
  });
}

const productions: Production[] = [
  {
    name: "Vive Linares",
    coverSrc: "/producciones/portada vive Linares2.jpg",
    images: buildImagesFromManifest("ViveLinares", "Vive Linares"),
  },
  {
    name: "Festival de Jazz",
    coverSrc: "/producciones/portada festival jazz.jpg",
    images: buildImagesFromManifest("FestivalJazz", "Festival de Jazz"),
  },
  {
    name: "New Wave",
    coverSrc: "/producciones/portada New Wave2.jpg",
    images: buildImagesFromManifest("NewWave", "New Wave"),
  },
  {
    name: "Ibero Joven",
    coverSrc: "/producciones/portada ibero joven.jpg",
    images: buildImagesFromManifest("IberoJoven", "Ibero Joven"),
  },
  {
    name: "JC Reyes",
    coverSrc: "/producciones/PORTADA jc reyes.jpg",
    images: buildImagesFromManifest("JCReyes", "JC Reyes"),
  },
  {
    name: "Joaquín Sabina",
    coverSrc: "/producciones/PORTADA Joaquín Sabina.jpg",
    images: buildImagesFromManifest("JoaquinSabina", "Joaquín Sabina"),
  },
  {
    name: "Panorama",
    coverSrc: "/producciones/PORTADA Panorama.jpg",
    images: buildImagesFromManifest("Panorama", "Panorama"),
  },
  {
    name: "Quevedo",
    coverSrc: "/producciones/PORTADA quevedo.jpg",
    images: buildImagesFromManifest("Quevedo", "Quevedo"),
  },
  {
    name: "Raphael",
    coverSrc: "/producciones/PORTADA Raphael.jpg",
    images: buildImagesFromManifest("Raphael", "Raphael"),
  },
];

export { productions };
