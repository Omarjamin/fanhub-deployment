import SearchModel from '../../../Models/bini_models/SearchModel.js';

class SearchController {
  constructor() {
    this.searchModel = new SearchModel();
  }
  async ensureDbForRequest(req, res) {
    const communityType =
      res.locals.communityType ||
      String(req.headers['x-community-type'] || '').trim().toLowerCase();
    await this.searchModel.ensureConnection(communityType);
  }
  // Search users by keyword
  async searchUser(req, res) {
    const keyword = req.query.keyword || '';
    console.log("Received keyword:", keyword); 

    if (!keyword || keyword.length < 1) {  
      return res.status(400).json({ error: "Keyword is required and must be at least 3 characters long" });
    }

    try {
      await this.ensureDbForRequest(req, res);
      const results = await this.searchModel.searchUser(keyword);
      console.log("Search Results:", results); 
      res.status(200).json(results);
    } catch (err) {
      console.error("Search error:", err); 
      res.status(500).json({ error: err.message });
    }
  }

  async searchHashtagPosts(req, res) {
    const keyword = req.query.keyword || '';

    if (!keyword || keyword.length < 2) {
      return res.status(400).json({ error: "Hashtag keyword is required." });
    }

    try {
      await this.ensureDbForRequest(req, res);
      const results = await this.searchModel.searchPostsByHashtag(keyword);
      return res.status(200).json(results);
    } catch (err) {
      console.error("Hashtag search error:", err);
      return res.status(500).json({ error: err.message });
    }
  }

  async searchPosts(req, res) {
    const keyword = req.query.keyword || '';

    if (!keyword || keyword.length < 1) {
      return res.status(400).json({ error: "Keyword is required." });
    }

    try {
      await this.ensureDbForRequest(req, res);
      const results = await this.searchModel.searchPosts(keyword);
      return res.status(200).json(results);
    } catch (err) {
      console.error("Post search error:", err);
      return res.status(500).json({ error: err.message });
    }
  }
}

export default SearchController;
