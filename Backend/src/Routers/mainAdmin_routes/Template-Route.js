import express from 'express';
import TemplateController from '../Controllers/Template-Controller.js';
import authenticate from '../Middlewares/authentication.js';
import authorize from '../Middlewares/authorization.js';
import multer from 'multer';

const router = express.Router();
const templateCtrl = new TemplateController();

// Setup multer for file uploads
const upload = multer({ dest: 'uploads/' });

// Protected routes
router.post(
  '/generate',
  authenticate,
  authorize,
  upload.fields([
    { name: 'hero_section', maxCount: 1 },
    { name: 'members_img', maxCount: 1 },
    { name: 'music_img', maxCount: 1 },
    { name: 'event_img', maxCount: 1 },
    { name: 'announcement_img', maxCount: 1 },
  ]),
  templateCtrl.generateTemplate.bind(templateCtrl)
);

router.get('/all', authenticate, authorize, templateCtrl.getAllTemplates.bind(templateCtrl));
router.get('/:id', authenticate, authorize, templateCtrl.getTemplate.bind(templateCtrl));
router.delete('/:id', authenticate, authorize, templateCtrl.deleteTemplate.bind(templateCtrl));

export default router;
