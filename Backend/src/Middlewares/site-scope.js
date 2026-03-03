import { attachSiteScope } from '../utils/site-scope.js';

export default function attachGlobalSiteScope(req, res, next) {
  const scoped = attachSiteScope(req, res);
  const siteSlug = String(scoped || '').trim().toLowerCase();
  if (siteSlug) {
    res.locals.siteSlug = siteSlug;
    res.locals.communityType = siteSlug;
  }
  next();
}
