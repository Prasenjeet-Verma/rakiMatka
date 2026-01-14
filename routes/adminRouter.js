const express = require('express');
const adminRouter = express.Router();
const adminController = require('../controller/adminController');

adminRouter.get('/login', adminController.getAdminLoginPage);
adminRouter.post('/login', adminController.postAdminLogin);
adminRouter.get('/dashboard', adminController.getAdminDashboard);
adminRouter.get('/allUsers', adminController.getAllUsersPage);
adminRouter.post("/user-status/:userId", adminController.toggleUserStatus);
adminRouter.post("/update-wallet", adminController.updateWallet);

module.exports = adminRouter;