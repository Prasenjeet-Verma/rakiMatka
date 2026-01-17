const express = require('express');
const adminRouter = express.Router();
const adminController = require('../controller/adminController');

adminRouter.get('/admin/login', adminController.getAdminLoginPage);
adminRouter.post('/admin/login', adminController.postAdminLogin);
adminRouter.get('/admin/dashboard', adminController.getAdminDashboard);
adminRouter.get('/admin/allUsers', adminController.getAllUsersPage);
adminRouter.post("/admin/user-status/:userId", adminController.toggleUserStatus);
adminRouter.post("/admin/update-wallet", adminController.updateWallet);
adminRouter.post("/admin/createuser", adminController.adminCreateUser);
adminRouter.get('/admin/singleuser-details/:userId', adminController.getSingleUserDetails);
adminRouter.post("/admin/change-user-password", adminController.changeUserPassword);
adminRouter.get('/admin/CreateGame', adminController.getAdminCreateGamePage);
adminRouter.post("/admin/game/add", adminController.postAddGame);
adminRouter.post("/admin/game/update-day/:gameId", adminController.updateSingleDay);
adminRouter.post("/admin/game/update-all/:gameId", adminController.updateAllDays);
adminRouter.post("/admin/game/delete/:gameId", adminController.deleteGame);

module.exports = adminRouter;