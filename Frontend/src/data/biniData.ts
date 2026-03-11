import { getModernSiteData } from "@/lib/modern-react/context";

function resolveSiteInfo() {
  const site = getModernSiteData() || {};
  return {
    name: String(site.site_name || site.community_name || site.community_type || "Community"),
    logo: String(site.logo || site.site_logo || site.group_photo || ""),
  };
}

export const siteInfo = new Proxy(
  {},
  {
    get(_target, key: string) {
      return resolveSiteInfo()[key as keyof ReturnType<typeof resolveSiteInfo>];
    },
  },
) as { name: string; logo: string };

export const products = [];
