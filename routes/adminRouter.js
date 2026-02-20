const express = require("express");
const adminRouter = express.Router();
const adminController = require("../controller/adminController");

adminRouter.get("/admin/login", adminController.getAdminLoginPage);
adminRouter.post("/admin/login", adminController.postAdminLogin);
adminRouter.get("/admin/dashboard", adminController.getAdminDashboard);
adminRouter.get("/admin/allUsers", adminController.getAllUsersPage);
adminRouter.post(
  "/admin/user-status/:userId",
  adminController.toggleUserStatus,
);
adminRouter.post("/admin/update-wallet", adminController.updateWallet);
adminRouter.post("/admin/createuser", adminController.adminCreateUser);
adminRouter.get(
  "/admin/singleuser-details/:userId",
  adminController.getSingleUserDetails,
);
adminRouter.post(
  "/admin/change-user-password",
  adminController.changeUserPassword,
);
adminRouter.get("/admin/CreateGame", adminController.getAdminCreateGamePage);
adminRouter.get(
  "/admin/CreateMainStarlineGame",
  adminController.getAdminCreateMainStarlineGamePage,
);
adminRouter.get(
  "/admin/CreateMainJackpotGame",
  adminController.getAdminCreateMainJackpotGamePage,
);
adminRouter.post("/admin/game/add/:type", adminController.postAddGame);
adminRouter.post(
  "/admin/game/update-day/:gameId/:type",
  adminController.updateSingleDay,
);
adminRouter.post(
  "/admin/game/update-all/:gameId/:type",
  adminController.updateAllDays,
);
adminRouter.post(
  "/admin/game/delete/:gameId/:type",
  adminController.deleteGame,
);

// Game rates routes
adminRouter.get("/admin/GameRates", adminController.getAdminGameRatesPage);
adminRouter.post("/admin/GameRates", adminController.postGameRates);
adminRouter.post(
  "/admin/game-rates/toggle/:id",
  adminController.toggleGameRate,
);
adminRouter.post(
  "/admin/game-rates/delete/:id",
  adminController.deleteGameRate,
);
// UPDATE GAME RATE
adminRouter.post(
  "/admin/game-rates/update/:id",
  adminController.updateGameRate,
);

// Result declaration routes
adminRouter.get("/admin/GameResult", adminController.gameResult);
adminRouter.get("/admin/pending-games", adminController.getPendingGames);
adminRouter.post("/admin/declare-result", adminController.declareGameResult);
//Jackpot game result declaration route
adminRouter.get("/admin/Jackpot-GameResult", adminController.jackpotGameResult);
adminRouter.get(
  "/admin/jackpot-pending-games",
  adminController.getJackpotPendingGames,
);
adminRouter.post(
  "/admin/jackpot-declare-result",
  adminController.declareJackpotGameResult,
);
// Starline game result declaration route
adminRouter.get(
  "/admin/starlineGameResult",
  adminController.starlineGameResult,
);
adminRouter.get(
  "/admin/starline-pending-games",
  adminController.getStarlinePendingGames,
);
adminRouter.post(
  "/admin/starline-declare-result",
  adminController.declareStarlineGameResult,
);
// Route to fetch game result details for a specific game (for admin)
adminRouter.post(
  "/admin/show-preview-winner-list",
  adminController.showPreviewWinnerList,
);
//Change bid number and amount route
adminRouter.post(
  "/admin/change-bid-number-amount",
  adminController.changeBidNumberAmount,
);
//admin route to view all pending result of a specific game
adminRouter.get(
  "/admin/ViewThisGameAllPendingResult",
  adminController.viewThisGameAllPendingResult,
);
//admin route to see preview winner result of a specific starline game
adminRouter.post(
  "/admin/starline-show-preview-winner-list",
  adminController.starlinePreviewWinnerList,
);
adminRouter.post(
  "/admin/starline-change-bid-number-amount",
  adminController.starlineChangeBidNumberAndAmount,
);
adminRouter.get(
  "/admin/ViewStarlineThisGameAllPendingResult",
  adminController.viewStarlineThisGameAllPendingResult,
);

//Jackpot game routes to see preview winner result of a specific starline game
adminRouter.post(
  "/admin/jackpot-show-preview-winner-list",
  adminController.jackpotPreviewWinnerList,
);
adminRouter.post(
  "/admin/jackpot-change-bid-number-amount",
  adminController.jackpotChangeBidNumberAndAmount,
);
adminRouter.get(
  "/admin/ViewJackpotThisGameAllPendingResult",
  adminController.viewJackpotThisGameAllPendingResult,
);

//Admin Generate fake result in bulk route
adminRouter.get(
  "/admin/GenerateResult",
  adminController.getAdminGenerateResultPage,
);
adminRouter.post(
  "/admin/generate-result",
  adminController.generateNormalGameResult,
);
adminRouter.post(
  "/admin/generate-starline-result",
  adminController.generateStarlineGameResult,
);

adminRouter.post(
  "/admin/generate-jackpot-result",
  adminController.generateJackpotGameResult,
);

// Notification routes
adminRouter.get(
  "/admin/bell-notifications",
  adminController.getAdminNotifications,
);
adminRouter.post(
  "/admin/bell-notifications",
  adminController.postAdminNotifications,
);
adminRouter.post(
  "/admin/delete-notification/:id",
  adminController.deleteNotification,
);

adminRouter.get("/admin/send-notification", adminController.getSendNotificationPage);

module.exports = adminRouter;
