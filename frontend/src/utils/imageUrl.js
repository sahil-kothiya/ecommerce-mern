import { API_CONFIG } from "../constants";

const normalizePath = (value) => value.trim().replace(/\\+/g, "/");

export const getImageSource = (raw) => {
  if (!raw) return null;
  if (typeof raw === "object") {
    return raw.path || raw.url || raw.src || null;
  }
  return raw;
};

export const resolveImageUrl = (raw, options = {}) => {
  const {
    placeholder = "/images/placeholder.webp",
    baseUrl = API_CONFIG.BASE_URL,
  } = options;

  const source = getImageSource(raw);
  if (!source || typeof source !== "string") return placeholder;

  const path = normalizePath(source);
  if (!path) return placeholder;

  if (/^(https?:)?\/\//i.test(path) || /^data:image\//i.test(path)) {
    return path;
  }

  const imagesIndex = path.toLowerCase().indexOf("/images/");
  if (imagesIndex >= 0) {
    return path.slice(imagesIndex);
  }
  if (path.toLowerCase().startsWith("images/")) {
    return `/${path}`;
  }

  const uploadsIndex = path.toLowerCase().indexOf("/uploads/");
  if (uploadsIndex >= 0) {
    const uploadsPath = path.slice(uploadsIndex).replace(/^\/+/, "");
    return `${baseUrl}/${uploadsPath}`;
  }
  if (path.toLowerCase().startsWith("uploads/")) {
    return `${baseUrl}/${path.replace(/^\/+/, "")}`;
  }

  if (/^(products|categories|brands|banners|users)\//i.test(path)) {
    return `${baseUrl}/uploads/${path.replace(/^\/+/, "")}`;
  }

  return `${baseUrl}/${path.replace(/^\/+/, "")}`;
};

const getPrimaryImageFromList = (images) => {
  const list = Array.isArray(images) ? images : [];
  return list.find((img) => img?.isPrimary) || list[0] || null;
};

export const getPrimaryProductImage = (product, options = {}) => {
  const { preferActiveVariants = true } = options;

  const directPrimary = getPrimaryImageFromList(product?.images);
  if (directPrimary) return directPrimary;

  const variants = Array.isArray(product?.variants) ? product.variants : [];
  const activeVariants = variants.filter(
    (variant) => !variant?.status || variant.status === "active",
  );
  const variantSource =
    preferActiveVariants && activeVariants.length ? activeVariants : variants;

  for (const variant of variantSource) {
    const variantPrimary = getPrimaryImageFromList(variant?.images);
    if (variantPrimary) return variantPrimary;
  }

  return null;
};

export const getPrimaryCartItemImage = (item) => {
  const variantPrimary =
    getPrimaryImageFromList(item?.variant?.images) ||
    getPrimaryImageFromList(item?.variantId?.images);

  if (variantPrimary) return variantPrimary;
  return getPrimaryProductImage(item?.product);
};
