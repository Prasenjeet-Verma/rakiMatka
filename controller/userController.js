


// controllers/userController.js
exports.UserHomePage = async (req, res, next) => {
  try {
    // This will be either the user object or undefined
    const user = req.session.user || null;

    // isLoggedIn will be true or false
    const isLoggedIn = !!req.session.isLoggedIn;

    // Render your home page and pass the session info
    res.render("User/UserHomePage", {
      user: user,
      isLoggedIn: isLoggedIn
    });
  } catch (err) {
    console.error("Error in UserHomePage:", err);
    next(err); // pass error to Express error handler
  }
};
