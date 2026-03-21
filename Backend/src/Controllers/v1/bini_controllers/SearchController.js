import SearchModel from '../../../Models/bini_models/SearchModel.js';
import { resolveSiteSlug } from '../../../utils/site-scope.js';
import { validateSearchKeyword } from '../../../utils/search-query.js';

class SearchController {
  constructor() {
    this.searchModel = new SearchModel();
  }
  parseKeyword(rawKeyword, options = {}) {
    const validation = validateSearchKeyword(rawKeyword, options);
    if (!validation.isValid) {
      const err = new Error(validation.errors[0] || 'Keyword is required.');
      err.statusCode = 400;
      throw err;
    }
    return validation.sanitized;
  }
  async ensureDbForRequest(req, res) {
    const communityType = resolveSiteSlug(req, res);
    if (!communityType) {
      const err = new Error('community_type is required');
      err.statusCode = 400;
      throw err;
    }
    await this.searchModel.ensureConnection(communityType);
  }
  // Search users by keyword
  async searchUser(req, res) {
    try {
      const keyword = this.parseKeyword(req.query.keyword, { label: 'Keyword', minLength: 1 });
      console.log("Received keyword:", keyword); 
      await this.ensureDbForRequest(req, res);
      const results = await this.searchModel.searchUser(keyword);
      console.log("Search Results:", results); 
      res.status(200).json(results);
    } catch (err) {
      console.error("Search error:", err); 
      res.status(err.statusCode || 500).json({ error: err.message });
    }
  }

  async searchHashtagPosts(req, res) {
    try {
      const keyword = this.parseKeyword(req.query.keyword, { label: 'Hashtag keyword', minLength: 1 });
      await this.ensureDbForRequest(req, res);
      const results = await this.searchModel.searchPostsByHashtag(keyword);
      return res.status(200).json(results);
    } catch (err) {
      console.error("Hashtag search error:", err);
      return res.status(err.statusCode || 500).json({ error: err.message });
    }
  }

  async searchPosts(req, res) {
    try {
      const keyword = this.parseKeyword(req.query.keyword, { label: 'Keyword', minLength: 1 });
      await this.ensureDbForRequest(req, res);
      const results = await this.searchModel.searchPosts(keyword);
      return res.status(200).json(results);
    } catch (err) {
      console.error("Post search error:", err);
      return res.status(err.statusCode || 500).json({ error: err.message });
    }
  }
}

export default SearchController;
