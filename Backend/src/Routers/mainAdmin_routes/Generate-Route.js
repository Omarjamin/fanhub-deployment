import express from 'express';
import GenerateController from '../../Controllers/v1/mainAdmin_controllers/Generate-Controller.js';
import authenticate from '../../Middlewares/authentication.js';
import authorize from '../../Middlewares/authorization.js';



const Generaterouter = express.Router();
const generateCtrl = GenerateController;

// ===== PROTECTED ROUTES =====
// POST - Create new website
Generaterouter.post('/generate-website', authenticate, authorize, generateCtrl.generateWebsite.bind(generateCtrl));

// GET - All generated websites
Generaterouter.get('/generated-websites', authenticate, authorize, generateCtrl.getGeneratedWebsites.bind(generateCtrl));
Generaterouter.get('/community-selections', authenticate, authorize, generateCtrl.getCommunitySelections.bind(generateCtrl));

// GET - Single website by community type (public for fanhub/<communityType>)
Generaterouter.get('/generated-websites/type/:communityType', generateCtrl.getWebsiteByCommunityType.bind(generateCtrl));

// GET - Single website by ID
Generaterouter.get('/generated-websites/:id', generateCtrl.getWebsiteById.bind(generateCtrl));

// PUT - Update generated website info/status
Generaterouter.put('/generated-websites/:id', authenticate, authorize, generateCtrl.updateGeneratedWebsite.bind(generateCtrl));

Generaterouter.get('/gettemplate', authenticate, authorize, generateCtrl.getTemplate.bind(generateCtrl));

export default Generaterouter;
