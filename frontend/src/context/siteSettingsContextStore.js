import { createContext } from "react";

export const DEFAULT_SITE_SETTINGS = Object.freeze({
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

export const SiteSettingsContext = createContext({
  settings: DEFAULT_SITE_SETTINGS,
  isLoading: true,
  refresh: async () => {},
});
