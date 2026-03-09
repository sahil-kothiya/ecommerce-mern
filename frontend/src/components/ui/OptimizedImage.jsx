import React, { useState } from 'react';
import { resolveImageUrl, resolveThumbnailUrl } from '../../utils/imageUrl';

const FALLBACK_IMAGE = '/images/404-error-cyberpunk-5120x2880-18226.webp';

/**
 * Optimized image component with:
 * - Lazy loading by default
 * - Thumbnail support for listing views
 * - Explicit width/height to prevent CLS
 * - Error fallback
 * - srcset for responsive images when thumbnailPath is available
 *
 * @param {Object} props
 * @param {Object|string} props.image - Image object (with path, thumbnailPath) or string path
 * @param {string} [props.alt] - Alt text
 * @param {number} [props.width] - Width attribute
 * @param {number} [props.height] - Height attribute
 * @param {boolean} [props.useThumbnail] - Use thumbnail version if available
 * @param {string} [props.className]
 * @param {string} [props.loading] - "lazy" | "eager"
 * @param {Object} [props.rest] - Additional img attributes
 */
const OptimizedImage = ({
  image,
  alt = '',
  width,
  height,
  useThumbnail = false,
  className = '',
  loading = 'lazy',
  ...rest
}) => {
  const [hasError, setHasError] = useState(false);

  const src = hasError
    ? resolveImageUrl(FALLBACK_IMAGE)
    : useThumbnail
      ? resolveThumbnailUrl(image)
      : resolveImageUrl(image);

  const fullSrc = resolveImageUrl(image);
  const thumbSrc = resolveThumbnailUrl(image);

  const hasSrcSet = useThumbnail && thumbSrc !== fullSrc;

  return (
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      loading={loading}
      className={className}
      onError={() => {
        if (!hasError) setHasError(true);
      }}
      {...(hasSrcSet && {
        srcSet: `${thumbSrc} 300w, ${fullSrc} 1200w`,
        sizes: '(max-width: 640px) 300px, 1200px',
      })}
      {...rest}
    />
  );
};

export default OptimizedImage;
