import { useContext } from "react";
import { SiteSettingsContext } from "./siteSettingsContextStore";

export function useSiteSettings() {
  return useContext(SiteSettingsContext);
}
