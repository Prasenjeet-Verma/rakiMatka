const express = require('express');
const loginAndSingupRouter = express.Router();
const loginAndSignupController = require('../controller/loginAndSignupController');
function redirectIfLoggedIn(req, res, next) {
  if (req.session.isLoggedIn) {
    return res.redirect("/userdashboard"); // or role-based redirect
  }
  next();
}
loginAndSingupRouter.get('/login', redirectIfLoggedIn,loginAndSignupController.getloginPage);
loginAndSingupRouter.post('/login', loginAndSignupController.postLoginPage);
loginAndSingupRouter.get('/signup', loginAndSignupController.getSignupPage);
loginAndSingupRouter.post('/signup', loginAndSignupController.postSignupPage);
loginAndSingupRouter.get('/logout', loginAndSignupController.logoutUserAndAdmin);

module.exports = loginAndSingupRouter;