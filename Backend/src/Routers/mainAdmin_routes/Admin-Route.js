import express from 'express';
import AdminController from '../../Controllers/v1/mainAdmin_controllers/Admin-Controller.js';
import authenticate from '../../Middlewares/authentication.js';
import authorize from '../../Middlewares/authorization.js';

const router = express.Router();
const adminCtrl = new AdminController();

// ===== PUBLIC =====
router.post('/create-admin', adminCtrl.createAdmin.bind(adminCtrl));
router.post('/login', adminCtrl.loginAdmin.bind(adminCtrl));
router.post('/request-reset', adminCtrl.requestPasswordReset.bind(adminCtrl));
router.post('/verify-reset', adminCtrl.verifyOtpAndResetPassword.bind(adminCtrl));

// ===== PROTECTED =====
router.post('/logout', authenticate, authorize, adminCtrl.logoutAdmin.bind(adminCtrl));
router.put('/update-password', authenticate, authorize, adminCtrl.updatePassword.bind(adminCtrl));
router.delete('/delete', authenticate, authorize, adminCtrl.deleteAdmin.bind(adminCtrl));

export default router;
