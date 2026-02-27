import { useEffect, useMemo, useState } from "react";
import { API_CONFIG } from "../constants";
import {
  DEFAULT_SITE_SETTINGS,
  SiteSettingsContext,
} from "./siteSettingsContextStore";

export function SiteSettingsProvider({ children }) {
  const [settings, setSettings] = useState(DEFAULT_SITE_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = async () => {
    try {
      const response = await fetch(
        `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.SETTINGS}/public`,
      );
      if (!response.ok) return;
      const payload = await response.json();
      const data = payload?.data || {};
      setSettings((prev) => ({ ...prev, ...data }));
    } catch {
      // Keep defaults silently for storefront resiliency.
    } finally {
      setIsLoading(false);
    }
  };

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
    () => ({ settings, isLoading, refresh }),
    [settings, isLoading],
  );

  return (
    <SiteSettingsContext.Provider value={value}>
      {children}
    </SiteSettingsContext.Provider>
  );
}

