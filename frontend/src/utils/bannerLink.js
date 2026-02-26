const normalizePath = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return "";
  return raw.startsWith("/") ? raw : `/${raw}`;
};

const isAbsoluteUrl = (value) =>
  /^https?:\/\//i.test(String(value || "").trim());

const firstDiscountId = (banner) => {
  const fromDiscountIds = Array.isArray(banner?.discountIds)
    ? banner.discountIds[0]
    : null;
  const fromDiscounts = Array.isArray(banner?.discounts)
    ? banner.discounts[0]
    : null;

  return (
    fromDiscountIds?._id ||
    fromDiscountIds ||
    fromDiscounts?._id ||
    fromDiscounts ||
    ""
  );
};

export const resolveBannerAction = (banner) => {
  const linkType = String(banner?.linkType || banner?.link_type || "")
    .trim()
    .toLowerCase();
  const rawLink = String(banner?.link || "").trim();
  const target = banner?.linkTarget === "_blank" ? "_blank" : "_self";

  if (rawLink && isAbsoluteUrl(rawLink)) {
    return { href: rawLink, target, external: true };
  }

  if (linkType === "discount") {
    const discountId = String(firstDiscountId(banner) || "").trim();
    if (discountId) {
      return {
        href: `/products?discount=${encodeURIComponent(discountId)}`,
        target: "_self",
        external: false,
      };
    }
  }

  if (linkType === "product") {
    if (rawLink) {
      if (rawLink.startsWith("/products/")) {
        return { href: rawLink, target, external: false };
      }
      if (rawLink.startsWith("/product/")) {
        return {
          href: rawLink.replace("/product/", "/products/"),
          target,
          external: false,
        };
      }
      if (rawLink.startsWith("/")) {
        return { href: rawLink, target, external: false };
      }
      return {
        href: `/products/${encodeURIComponent(rawLink)}`,
        target,
        external: false,
      };
    }
    return { href: "/products", target: "_self", external: false };
  }

  if (linkType === "category") {
    if (rawLink) {
      if (
        rawLink.startsWith("/categories") ||
        rawLink.startsWith("/products")
      ) {
        return { href: rawLink, target, external: false };
      }
      if (rawLink.startsWith("/category/")) {
        return {
          href: rawLink.replace("/category/", "/categories/"),
          target,
          external: false,
        };
      }
      if (rawLink.startsWith("/")) {
        return { href: rawLink, target, external: false };
      }
      return {
        href: `/products?category=${encodeURIComponent(rawLink)}`,
        target,
        external: false,
      };
    }
    return { href: "/products", target: "_self", external: false };
  }

  if (rawLink) {
    return {
      href: normalizePath(rawLink),
      target,
      external: false,
    };
  }

  return { href: "/products", target: "_self", external: false };
};
