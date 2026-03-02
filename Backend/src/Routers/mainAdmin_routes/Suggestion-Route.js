import { Router } from "express";
import SuggestionController from "../../Controllers/v1/mainAdmin_controllers/Suggestion-Controller.js";
import authenticate from "../../Middlewares/authentication.js";
import authorize from "../../Middlewares/authorization.js";

const router = Router();
const suggestionCtrl = new SuggestionController();

// Public form submit (apikey required, no login required)
router.post("/public", authorize, suggestionCtrl.createPublicSuggestion.bind(suggestionCtrl));

// Admin notification endpoints
router.use(authenticate);
router.use(authorize);
router.get("/notifications", suggestionCtrl.getUnreadSuggestions.bind(suggestionCtrl));
router.post("/read-all", suggestionCtrl.markAllSuggestionsRead.bind(suggestionCtrl));
router.post("/:suggestionId/read", suggestionCtrl.markSuggestionRead.bind(suggestionCtrl));

export default router;
