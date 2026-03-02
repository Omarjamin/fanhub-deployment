import SearchModel from '../../../Models/ecommerce_model/SearchModel.js';

class SearchController {
  constructor() {
    this.searchModel = new SearchModel();
  }
  // Search users by keyword
  async searchUser(req, res) {
    const keyword = req.query.keyword || '';
    console.log("Received keyword:", keyword); 

    if (!keyword || keyword.length < 1) {  
      return res.status(400).json({ error: "Keyword is required and must be at least 3 characters long" });
    }

    try {
      const results = await this.searchModel.searchUser(keyword);
      console.log("Search Results:", results); 
      res.status(200).json(results);
    } catch (err) {
      console.error("Search error:", err); 
      res.status(500).json({ error: err.message });
    }
  }
}

export default SearchController;
