const express = require('express');
const loginAndSingupRouter = express.Router();
const loginAndSignupController = require('../controller/loginAndSignupController');

loginAndSingupRouter.get('/login', loginAndSignupController.getloginPage);
loginAndSingupRouter.post('/login', loginAndSignupController.postLoginPage);
loginAndSingupRouter.get('/signup', loginAndSignupController.getSignupPage);
loginAndSingupRouter.post('/signup', loginAndSignupController.postSignupPage);


module.exports = loginAndSingupRouter;