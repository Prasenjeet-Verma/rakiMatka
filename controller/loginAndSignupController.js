const { check, validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
const User = require("../model/userSchema");

// --- GET Signup Page ---
exports.getSignupPage = async (req, res, next) => {
  try {
    // if (req.session.isLoggedIn) return res.redirect("/");

    res.render("LoginandSignup/createAccount", {
      pageTitle: "Create Account",
      isLoggedIn: false,
      errors: [],
      oldInput: { username: "", phone: "", password: "", confirmPassword: "" },
    });
  } catch (err) {
    next(err);
  }
};

// --- POST Signup Page ---
exports.postSignupPage = [
  check("username").trim().notEmpty().withMessage("Username is required")
    .isLength({ min: 3 }).withMessage("Username must be at least 3 characters")
    .custom(async (value) => {
      const user = await User.findOne({ username: value });
      if (user) throw new Error("Username already in use");
      return true;
    }),
  check("phone").trim().notEmpty().withMessage("Phone number is required")
    .custom(async (value) => {
      const user = await User.findOne({ phoneNo: value });
      if (user) throw new Error("Phone number already in use");
      return true;
    }),
  check("password").notEmpty().withMessage("Password is required")
    .isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),
  check("confirmPassword").custom((value, { req }) => {
    if (value !== req.body.password) throw new Error("Passwords do not match");
    return true;
  }),

  async (req, res, next) => {
    const errors = validationResult(req);
    const { username, phone, password } = req.body;

    if (!errors.isEmpty()) {
      return res.status(400).render("LoginandSignup/createAccount", {
        pageTitle: "Create Account",
        isLoggedIn: false,
        errors: errors.array().map((e) => e.msg),
        oldInput: { username, phone, password, confirmPassword: req.body.confirmPassword },
      });
    }

    try {
      const hashedPassword = await bcrypt.hash(password, 10);

      const newUser = new User({
        username,
        phoneNo: phone,
        password: hashedPassword,
        role: "user",
        userStatus: "active",
      });

      await newUser.save();
      res.redirect("/login");
    } catch (err) {
      console.error(err);
      res.status(500).render("LoginandSignup/createAccount", {
        pageTitle: "Create Account",
        isLoggedIn: false,
        errors: ["Something went wrong. Try again."],
        oldInput: { username, phone, password, confirmPassword: req.body.confirmPassword },
      });
    }
  },
];

// --- GET Login Page ---
exports.getloginPage = (req, res, next) => {
  try {
    // if (req.session.isLoggedIn) return res.redirect("/");
    res.render("LoginandSignup/login", {
      pageTitle: "Login",
      isLoggedIn: false,
      errors: [],
      oldInput: { login: "", password: "" },
    });
  } catch (err) {
    next(err);
  }
};

// --- POST Login Page ---
exports.postLoginPage = [
  check("login").trim().notEmpty().withMessage("Username or Phone is required"),
  check("password").notEmpty().withMessage("Password is required"),

  async (req, res, next) => {
    const errors = validationResult(req);
    const { login, password } = req.body;

    if (!errors.isEmpty()) {
      return res.status(400).render("LoginandSignup/login", {
        pageTitle: "Login",
        isLoggedIn: false,
        errors: errors.array().map((e) => e.msg),
        oldInput: { login, password },
      });
    }

    try {
      const user = await User.findOne({ $or: [{ username: login }, { phoneNo: login }] });

      if (!user || user.userStatus === "suspended") {
        return res.status(400).render("LoginandSignup/login", {
          pageTitle: "Login",
          isLoggedIn: false,
          errors: [user ? "Your account is suspended" : "Invalid login or password"],
          oldInput: { login, password },
        });
      }

      const match = await bcrypt.compare(password, user.password);
      if (!match) {
        return res.status(400).render("LoginandSignup/login", {
          pageTitle: "Login",
          isLoggedIn: false,
          errors: ["Invalid login or password"],
          oldInput: { login, password },
        });
      }

      // ✅ Session + role-based redirect
      req.session.isLoggedIn = true;

      // Common user session
      req.session.user = {
        _id: user._id.toString(),
        username: user.username,
        role: user.role,
        profilePhoto: user.profilePhoto,
      };

      // 🔥 If admin, also store in admin session
      if (user.role === "admin") {
        req.session.admin = {
          _id: user._id.toString(),
          username: user.username,
          role: user.role,
          profilePhoto: user.profilePhoto,
        };
      } else {
        req.session.admin = null; // normal users ke liye admin empty
      }

      await req.session.save();

      // Role based redirect
      if (user.role === "admin") {
        return res.redirect("/admin/dashboard");
      } else {
        return res.redirect("/userdashboard"); // ya user home
      }

    } catch (err) {
      console.error(err);
      res.status(500).render("LoginandSignup/login", {
        pageTitle: "Login",
        isLoggedIn: false,
        errors: ["Something went wrong. Try again."],
        oldInput: { login, password },
      });
    }
  },
];

// --- Logout ---
exports.logoutUserAndAdmin = (req, res, next) => {
  if (!req.session) return res.redirect("/login");

  // 🔹 Save role before destroying session
  const wasAdmin = req.session.admin?.role === "admin";

  req.session.destroy((err) => {
    if (err) {
      console.error("Logout Error:", err);
      return next(err);
    }

    res.clearCookie("connect.sid");

    // 🔹 Redirect based on previous role
    if (wasAdmin) {
      return res.redirect("/admin/login");
    }

    res.redirect("/login");
  });
};



