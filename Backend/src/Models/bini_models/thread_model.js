import { connect } from '../../core/database.js';

class Thread {
    constructor() {
        this.db = null;
    }

    async ensureConnection(siteSlug = '') {
        try {
            this.db = await connect(siteSlug);
        } catch (err) {
            console.error('thread_model.ensureConnection failed:', err?.message || err);
            this.db = await connect();
        }
        return this.db;
    }

    async getThreads(siteSlug = '') {
        try {
            const db = await this.ensureConnection(siteSlug);
            const query = `
              SELECT
                id,
                title,
                venue,
                date,
                author,
                is_pinned,
                is_pinned AS isPinned,
                created_at
              FROM community_threads
              ORDER BY is_pinned DESC, created_at DESC
            `;
            const [threads] = await db.query(query);
            return threads;
        } catch (err) {
            throw err;
        }
    }
}

export default Thread;
