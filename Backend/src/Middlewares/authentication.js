import jwt from 'jsonwebtoken';
import { connect, resolveCommunityContext } from '../core/database.js';
import { attachSiteScope } from '../utils/site-scope.js';

async function getActiveSuspension(siteSlug, userId) {
  if (!siteSlug || !userId) return null;
  try {
    const db = await connect(siteSlug);
    const [tableRows] = await db.query(
      `SELECT COUNT(*) AS count
       FROM INFORMATION_SCHEMA.TABLES
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'user_suspensions'
       LIMIT 1`,
    );
    if (Number(tableRows?.[0]?.count || 0) === 0) return null;

    const [rows] = await db.query(
      `SELECT suspension_id, starts_at, ends_at, reason
       FROM user_suspensions
       WHERE user_id = ?
         AND status = 'active'
         AND starts_at <= NOW()
         AND ends_at > NOW()
       ORDER BY created_at DESC
       LIMIT 1`,
      [userId],
    );
    return rows?.[0] || null;
  } catch (error) {
    return null;
  }
}

/**
 * Authentication for logged-in users
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next 
 */
export default async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  const headerSiteSlug = String(attachSiteScope(req, res) || '').trim().toLowerCase();
  if (headerSiteSlug) {
    res.locals.siteSlug = headerSiteSlug;
    res.locals.communityType = headerSiteSlug;
  }

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      'success': false,
      'message': 'Unauthenticated user',
    });
  }

  const token = authHeader.split(' ')[1];

  const secrets = [
    process.env.API_SECRET_KEY,
    process.env.JWT_SECRET,
  ].filter((value, index, list) => Boolean(value) && list.indexOf(value) === index);

  if (secrets.length === 0) {
    return res.status(500).json({
      success: false,
      message: 'JWT secret is not configured',
    });
  }

  let decoded = null;
  for (const secret of secrets) {
    try {
      decoded = jwt.verify(token, secret);
      break;
    } catch (_) {}
  }

  if (!decoded) {
    return res.status(403).json({
      success: false,
      message: 'Invalid token',
    });
  }

  res.locals.userId = decoded?.id;
  if (headerSiteSlug) {
    const community = await resolveCommunityContext(headerSiteSlug);
    if (community?.community_id) {
      res.locals.communityId = Number(community.community_id);
    }
  }

  const activeSuspension = await getActiveSuspension(headerSiteSlug, decoded?.id);
  if (activeSuspension) {
    return res.status(403).json({
      success: false,
      code: 'ACCOUNT_SUSPENDED',
      suspension_until: activeSuspension.ends_at,
      message: `Your account has been suspended until ${new Date(activeSuspension.ends_at).toLocaleString()}`,
    });
  }

  res.locals.authenticated = true;
  next();
}
