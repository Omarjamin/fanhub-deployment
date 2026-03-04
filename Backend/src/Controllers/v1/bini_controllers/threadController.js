import Thread from '../../../Models/bini_models/thread_model.js';

class ThreadController {
    constructor() {
        this.threadModel = new Thread();
    }

    async getThreads(req, res) {
        try {
            const siteSlug = String(
                res.locals.siteSlug ||
                res.locals.communityType ||
                req.headers['x-site-slug'] ||
                req.headers['x-community-type'] ||
                req.query.community ||
                req.query.site_slug ||
                ''
            ).trim().toLowerCase();
            if (!siteSlug) {
                return res.status(400).json({ error: 'site/community scope is required' });
            }
            const threads = await this.threadModel.getThreads(siteSlug);
            return res.status(200).json(threads);
        } catch (error) {
            console.error('Error fetching threads:', error);
            return res.status(200).json([]);
        }
    }

}

export default ThreadController;
