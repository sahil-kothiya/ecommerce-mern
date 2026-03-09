import { useState, useEffect } from 'react';
import settingsService from '../services/settingsService';

const FALLBACK_FORMATS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'tiff', 'tif', 'svg', 'heic', 'heif', 'avif', 'ico'];

const FORMAT_TO_MIME = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  bmp: 'image/bmp',
  tiff: 'image/tiff',
  tif: 'image/tiff',
  svg: 'image/svg+xml',
  heic: 'image/heic',
  heif: 'image/heif',
  avif: 'image/avif',
  ico: 'image/x-icon',
};

let cachedSettings = null;
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000;

/**
 * Hook that returns dynamic image upload accept string and settings from the backend.
 * @returns {{ accept: string, formats: string[], maxSizeMB: number, isLoading: boolean }}
 */
const useImageSettings = () => {
  const [settings, setSettings] = useState(() => {
    if (cachedSettings && Date.now() - cacheTimestamp < CACHE_TTL) {
      return cachedSettings;
    }
    return null;
  });
  const [isLoading, setIsLoading] = useState(!settings);

  useEffect(() => {
    if (settings) return;

    let cancelled = false;
    const load = async () => {
      try {
        const response = await settingsService.getImageSettings();
        const data = response.data;
        cachedSettings = data;
        cacheTimestamp = Date.now();
        if (!cancelled) setSettings(data);
      } catch {
        // fallback silently
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [settings]);

  const formats = settings?.allowedInputFormats || FALLBACK_FORMATS;
  const accept = formats
    .map((fmt) => FORMAT_TO_MIME[fmt] || `image/${fmt}`)
    .filter(Boolean)
    .join(',');
  const maxSizeMB = Math.round((settings?.maxFileSizeBytes || 10485760) / 1048576);

  return { accept, formats, maxSizeMB, isLoading };
};

export default useImageSettings;
