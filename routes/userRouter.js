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
//Play Game Route Start Here
userRouter.get("/play/:id", userController.getPlayGamePage);
userRouter.post("/single-digit/place-bet", userController.placeSingleDigitBet);
userRouter.post("/single-bulk-digit/place-bet", userController.placeSingleBulkDigitBet);
userRouter.post("/jodi-digit/place-bet", userController.placeJodiDigitBet);

module.exports = userRouter;