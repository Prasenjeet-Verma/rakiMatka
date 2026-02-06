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
adminRouter.get('/admin/CreateMainStarlineGame', adminController.getAdminCreateMainStarlineGamePage);
adminRouter.get('/admin/CreateMainJackpotGame', adminController.getAdminCreateMainJackpotGamePage);
adminRouter.post("/admin/game/add/:type", adminController.postAddGame);
adminRouter.post("/admin/game/update-day/:gameId/:type", adminController.updateSingleDay);
adminRouter.post("/admin/game/update-all/:gameId/:type", adminController.updateAllDays);
adminRouter.post("/admin/game/delete/:gameId/:type", adminController.deleteGame);
adminRouter.get('/admin/GameRates', adminController.getAdminGameRatesPage);
adminRouter.post('/admin/GameRates', adminController.postGameRates);
adminRouter.post("/admin/game-rates/toggle/:id", adminController.toggleGameRate);
adminRouter.post("/admin/game-rates/delete/:id", adminController.deleteGameRate);
adminRouter.get("/admin/GameResult", adminController.gameResult);
adminRouter.get("/admin/pending-games", adminController.getPendingGames);
adminRouter.post("/admin/declare-result", adminController.declareGameResult);


module.exports = adminRouter;