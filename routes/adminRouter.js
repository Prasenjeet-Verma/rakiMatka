const express = require('express');
const adminRouter = express.Router();
const adminController = require('../controller/adminController');

adminRouter.get('/admin/login', adminController.getAdminLoginPage);
adminRouter.post('/admin/login', adminController.postAdminLogin);
adminRouter.get('/admin/dashboard', adminController.getAdminDashboard);
adminRouter.get('/admin/allUsers', adminController.getAllUsersPage);
adminRouter.post("/admin/user-status/:userId", adminController.toggleUserStatus);
adminRouter.post("/admin/update-wallet", adminController.updateWallet);

module.exports = adminRouter;