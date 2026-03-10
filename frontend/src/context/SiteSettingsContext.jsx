import { useCallback, useEffect, useMemo, useState } from "react";
import { API_CONFIG } from "../constants";
import {
  DEFAULT_SITE_SETTINGS,
  SiteSettingsContext,
} from "./siteSettingsContextStore";

export function SiteSettingsProvider({ children }) {
  const [settings, setSettings] = useState(DEFAULT_SITE_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    try {
      setError(null);
      const response = await fetch(
        `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.SETTINGS}/public`,
      );
      if (!response.ok) {
        setError(`Failed to load settings (${response.status})`);
        return;
      }
      const payload = await response.json();
      const data = payload?.data || {};
      setSettings((prev) => ({ ...prev, ...data }));
    } catch (err) {
      setError(err?.message || "Failed to load site settings");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, []);

  useEffect(() => {
    const title = String(settings.metaTitle || settings.siteName || "").trim();
    const description = String(settings.metaDescription || settings.siteTagline || "").trim();

    if (title) {
      document.title = title;
    }

    if (description) {
      let descriptionTag = document.querySelector('meta[name="description"]');
      if (!descriptionTag) {
        descriptionTag = document.createElement("meta");
        descriptionTag.setAttribute("name", "description");
        document.head.appendChild(descriptionTag);
      }
      descriptionTag.setAttribute("content", description);
    }
  }, [settings.metaTitle, settings.metaDescription, settings.siteName, settings.siteTagline]);

  const value = useMemo(
    () => ({ settings, isLoading, error, refresh }),
    [settings, isLoading, error, refresh],
  );

  return (
    <SiteSettingsContext.Provider value={value}>
      {children}
    </SiteSettingsContext.Provider>
  );
}

