function normalizeSlug(value = "") {
  return String(value || "").trim().toLowerCase();
}

function isGlobalScope(value = "") {
  const normalized = normalizeSlug(value);
  return !normalized || normalized === "all" || normalized === "community-platform";
}

function pickFirst(...values) {
  for (const value of values) {
    const normalized = normalizeSlug(value);
    if (!isGlobalScope(normalized)) return normalized;
  }
  return "";
}

function extractFromPath(pathname = "") {
  const parts = String(pathname || "").split("/").filter(Boolean);
  if (!parts.length) return "";

  // /fanhub/community-platform/:siteSlug/...
  if (parts[0] === "fanhub" && parts[1] === "community-platform" && parts[2]) {
    return normalizeSlug(parts[2]);
  }

  // /fanhub/:siteSlug/...
  if (parts[0] === "fanhub" && parts[1] && parts[1] !== "community-platform") {
    return normalizeSlug(parts[1]);
  }

  return "";
}

function extractFromReferer(referer = "") {
  const match = String(referer || "").match(/\/fanhub\/(?:community-platform\/)?([^/?#]+)/i);
  return normalizeSlug(match?.[1] || "");
}

export function resolveSiteSlug(req = {}, res = {}) {
  const direct = pickFirst(
    res?.locals?.siteSlug,
    res?.locals?.communityType,
    req?.headers?.["x-site-slug"],
    req?.headers?.["x-community-type"],
    req?.query?.site_slug,
    req?.query?.community_type,
    req?.query?.domain,
    req?.query?.community,
    req?.body?.site_slug,
    req?.body?.community_type,
    req?.body?.domain,
    req?.body?.community,
    req?.params?.siteSlug,
    req?.params?.communityType,
    req?.params?.community,
    req?.params?.domain,
  );
  if (direct) return direct;

  const fromPath = pickFirst(
    extractFromPath(req?.originalUrl || ""),
    extractFromPath(req?.path || ""),
    extractFromPath(req?.url || ""),
  );
  if (fromPath) return fromPath;

  return extractFromReferer(req?.headers?.referer || req?.headers?.referrer || "");
}

export function attachSiteScope(req = {}, res = {}) {
  const siteSlug = resolveSiteSlug(req, res);
  if (!siteSlug) return "";
  res.locals.siteSlug = siteSlug;
  res.locals.communityType = siteSlug;
  return siteSlug;
}
