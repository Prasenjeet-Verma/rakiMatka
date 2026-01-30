const express = require('express');
const userRouter = express.Router();
const userController = require('../controller/userController');

userRouter.get('/', userController.UserHomePage);
userRouter.get('/userdashboard', userController.getUserDashboardPage);
userRouter.get('/userprofile', userController.getUserProfilePage);
userRouter.post('/usereditdetails', userController.postUserEditDetails);
userRouter.get('/userbankdetails', userController.getUserBankDetailsPage);
userRouter.post('/userbankdetails', userController.postUserBankDetails);
userRouter.get('/forgetuserpassword', userController.getUserChangePasswordPage);
userRouter.get('/usercontactadmin', userController.getUserContactAdminPage);
userRouter.get('/userGameRates', userController.getUserGameRatesPage);
userRouter.get('/userlanguage', userController.getUserLanguagePage);
userRouter.post('/forgetuserpassword', userController.postForgetUserPassword);
//Normal Game Data Submit Routes
userRouter.get("/play/:id", userController.getPlayGamePage);
userRouter.post("/single-digit/place-bet", userController.placeSingleDigitBet);
userRouter.post("/single-bulk-digit/place-bet", userController.placeSingleBulkDigitBet);
userRouter.post("/jodi-digit/place-bet", userController.placeJodiDigitBet);
userRouter.post("/jodi-digit-bulk/place-bet", userController.placeJodiDigitBulkBet);
userRouter.post("/single-panna/place-bet", userController.placeSinglePannaBet);
userRouter.post("/single-panna-bulk/place-bet", userController.placeSinglePannaBulkBet);
userRouter.post("/double-panna/place-bet", userController.placeDoublePannaBet);
userRouter.post("/double-panna-bulk/place-bet", userController.placeDoublePannaBulkBet);
userRouter.post("/triple-panna/place-bet", userController.placeTriplePannaBet);
userRouter.post("/odd-even/place-bet", userController.placeOddEvenBet);
userRouter.post("/half-sangam/place-bet", userController.placeHalfSangamBet);
userRouter.post("/full-sangam/place-bid", userController.placeFullSangamBid);
userRouter.post("/sp-motor/place-bet", userController.placeSPMotorBet);
userRouter.post("/dp-motor/place-bet", userController.placeDPMotorBet);
userRouter.post("/spdptp/place-bet", userController.placeSpDpTpBet);
userRouter.post("/red-bracket/place-bet", userController.placeRedBracketBet);
//Starline GameData Submit Routes
userRouter.get("/playstarline/:id", userController.getStarLinePlayGamePage);
userRouter.post("/starline-single-digit/place-bet", userController.placeStarlineSingleDigitBet);
userRouter.post("/starline-single-panna/place-bet", userController.placeStarlineSinglePannaBet);
userRouter.post("/starline-double-panna/place-bet", userController.placeStarlineDoublePannaBet);
userRouter.post("/starline-triple-panna/place-bet", userController.placeStarlineTriplePannaBet);
//Jackpot Game Data Submit Routes
userRouter.get("/playjackpot/:id", userController.getJackpotPlayGamePage);
userRouter.post("/right-digit/place-bet", userController.placeJackpotRightDigitBet);
userRouter.post("/left-digit/place-bet", userController.placeJackpotLeftDigitBet);
userRouter.post("/center-game/place-bet", userController.placeJackpotCenterJodiDigitBet);
// User Win History Route
userRouter.get("/user-win-history", userController.getUserWinHistory);
module.exports = userRouter;