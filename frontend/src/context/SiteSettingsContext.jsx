import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { API_CONFIG } from "../constants";

const DEFAULT_SITE_SETTINGS = Object.freeze({
  siteName: "Enterprise E-Commerce",
  siteTagline: "",
  siteUrl: "",
  logo: null,
  favicon: null,
  websiteEmail: "",
  supportEmail: "",
  phone: "",
  whatsapp: "",
  address: "",
  currencyCode: "USD",
  currencySymbol: "$",
  timezone: "UTC",
  maintenanceMode: false,
  metaTitle: "",
  metaDescription: "",
  facebook: "",
  instagram: "",
  twitter: "",
  youtube: "",
});

const SiteSettingsContext = createContext({
  settings: DEFAULT_SITE_SETTINGS,
  isLoading: true,
  refresh: async () => {},
});

/**
 * Site settings provider for public storefront pages.
 * @param {{ children: import("react").ReactNode }} props
 * @returns {JSX.Element}
 */
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

/**
 * Read public site settings context.
 * @returns {{ settings: typeof DEFAULT_SITE_SETTINGS, isLoading: boolean, refresh: () => Promise<void> }}
 */
export function useSiteSettings() {
  return useContext(SiteSettingsContext);
}

