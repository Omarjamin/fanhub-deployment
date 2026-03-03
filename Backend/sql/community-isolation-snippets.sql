-- Community isolation snippets (MySQL 8+)
-- Goal: resolve site/domain -> community_id, then scope all fetches by that ID.

-- 1) Input domain/site key
SET @domain_input = 'bini-website';

-- 2) Resolve active site + community_id (collation-safe)
SELECT
  s.site_id,
  s.site_name,
  s.domain,
  COALESCE(s.community_id, c.community_id, s.site_id) AS resolved_community_id
INTO
  @site_id,
  @site_name,
  @site_domain,
  @community_id
FROM sites s
LEFT JOIN communities c
  ON LOWER(TRIM(c.name)) = LOWER(TRIM(COALESCE(s.community_type, s.site_name)))
WHERE
  CONVERT(TRIM(s.domain) USING utf8mb4) COLLATE utf8mb4_general_ci =
  CONVERT(TRIM(@domain_input) USING utf8mb4) COLLATE utf8mb4_general_ci
  OR
  CONVERT(TRIM(s.site_name) USING utf8mb4) COLLATE utf8mb4_general_ci =
  CONVERT(TRIM(@domain_input) USING utf8mb4) COLLATE utf8mb4_general_ci
  OR
  CONVERT(TRIM(COALESCE(s.community_type, '')) USING utf8mb4) COLLATE utf8mb4_general_ci =
  CONVERT(TRIM(@domain_input) USING utf8mb4) COLLATE utf8mb4_general_ci
ORDER BY s.site_id DESC
LIMIT 1;

-- Fallback guard (optional)
SET @community_id = IFNULL(@community_id, 0);

-- 3) Add community_id columns (safe patterns)
-- Run only for tables you use; skip tables that already have column.
ALTER TABLE posts ADD COLUMN community_id INT NULL;
ALTER TABLE comments ADD COLUMN community_id INT NULL;
ALTER TABLE likes ADD COLUMN community_id INT NULL;
ALTER TABLE community_threads ADD COLUMN community_id INT NULL;
ALTER TABLE events ADD COLUMN community_id INT NULL;
ALTER TABLE discography ADD COLUMN community_id INT NULL;
ALTER TABLE music ADD COLUMN community_id INT NULL;
ALTER TABLE collections ADD COLUMN community_id INT NULL;
ALTER TABLE products ADD COLUMN community_id INT NULL;

-- 4) Backfill existing rows (example strategy)
-- If table already linked to site/community, map it directly.
UPDATE posts SET community_id = @community_id WHERE community_id IS NULL;
UPDATE comments SET community_id = @community_id WHERE community_id IS NULL;
UPDATE likes SET community_id = @community_id WHERE community_id IS NULL;
UPDATE community_threads SET community_id = @community_id WHERE community_id IS NULL;
UPDATE events SET community_id = @community_id WHERE community_id IS NULL;
UPDATE discography SET community_id = @community_id WHERE community_id IS NULL;
UPDATE music SET community_id = @community_id WHERE community_id IS NULL;
UPDATE collections SET community_id = @community_id WHERE community_id IS NULL;
UPDATE products SET community_id = @community_id WHERE community_id IS NULL;

-- 5) Indexes for faster scoped fetches
ALTER TABLE posts ADD INDEX idx_posts_community_id (community_id);
ALTER TABLE comments ADD INDEX idx_comments_community_id (community_id);
ALTER TABLE likes ADD INDEX idx_likes_community_id (community_id);
ALTER TABLE community_threads ADD INDEX idx_threads_community_id (community_id);
ALTER TABLE events ADD INDEX idx_events_community_id (community_id);
ALTER TABLE discography ADD INDEX idx_discography_community_id (community_id);
ALTER TABLE music ADD INDEX idx_music_community_id (community_id);
ALTER TABLE collections ADD INDEX idx_collections_community_id (community_id);
ALTER TABLE products ADD INDEX idx_products_community_id (community_id);

-- 6) Query snippets per endpoint/table

-- posts feed
-- SELECT ... FROM posts p WHERE p.community_id = @community_id ORDER BY p.created_at DESC;

-- comments by post
-- SELECT ... FROM comments c WHERE c.post_id = ? AND c.community_id = @community_id;

-- likes on post
-- SELECT COUNT(*) FROM likes WHERE like_type='post' AND post_id=? AND community_id=@community_id;

-- threads
-- SELECT ... FROM community_threads WHERE community_id=@community_id ORDER BY is_pinned DESC, created_at DESC;

-- events posters
-- SELECT event_id, ticket_link, image_url FROM events WHERE community_id=@community_id;

-- discography + tracks
-- SELECT ... FROM discography WHERE community_id=@community_id;
-- SELECT ... FROM music WHERE album_id=? AND community_id=@community_id;

-- ecommerce collections/products
-- SELECT * FROM collections WHERE community_id=@community_id;
-- SELECT * FROM products WHERE collection_id=? AND community_id=@community_id;
