const express = require('express');
const loginAndSingupRouter = express.Router();
const loginAndSignupController = require('../controller/loginAndSignupController');

// Middleware
function redirectIfLoggedIn(req, res, next) {
  if (req.session.isLoggedIn) {
    if (req.session.user.role === "admin") {
      return res.redirect("/admin/dashboard");
    }
    return res.redirect("/userdashboard");
  }
  next();
}
loginAndSingupRouter.get('/login', redirectIfLoggedIn,loginAndSignupController.getloginPage);
loginAndSingupRouter.post('/login', loginAndSignupController.postLoginPage);
loginAndSingupRouter.get('/signup', redirectIfLoggedIn,loginAndSignupController.getSignupPage);
loginAndSingupRouter.post('/signup', loginAndSignupController.postSignupPage);
loginAndSingupRouter.get('/logout', loginAndSignupController.logoutUserAndAdmin);

module.exports = loginAndSingupRouter;