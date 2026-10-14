// Rules for menu images, shared by the form (to warn early) and the server
// action (which decides). The menu-images bucket enforces the same size and
// types.

export const IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const IMAGE_MAX_LABEL = "5 MB";

const IMAGE_TYPES = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const;

export type ImageType = keyof typeof IMAGE_TYPES;

// For the file input's accept attribute.
export const IMAGE_ACCEPT = Object.keys(IMAGE_TYPES).join(",");

export function isImageType(value: string): value is ImageType {
  return Object.hasOwn(IMAGE_TYPES, value);
}

export function imageExtension(type: ImageType) {
  return IMAGE_TYPES[type];
}

// Reads the file's first bytes to tell its real format. The type the browser
// reports comes from the file name, so it is not trusted on its own.
export function sniffImageType(bytes: Uint8Array): ImageType | null {
  const startsWith = (signature: number[], offset = 0) =>
    signature.every((byte, index) => bytes[offset + index] === byte);

  if (startsWith([0xff, 0xd8, 0xff])) return "image/jpeg";
  if (startsWith([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return "image/png";
  }
  // "RIFF", four bytes of length, then "WEBP".
  if (
    startsWith([0x52, 0x49, 0x46, 0x46]) &&
    startsWith([0x57, 0x45, 0x42, 0x50], 8)
  ) {
    return "image/webp";
  }
  return null;
}
