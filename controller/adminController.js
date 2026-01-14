const { check, validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
const User = require("../model/userSchema");
const WalletTransaction = require("../model/WalletTransaction");
exports.getAdminLoginPage = async  (req, res, next) => {
  res.render("Admin/adminLogin", {
    pageTitle: "Admin Login",
    errors: [],
    oldInput: { login: "", password: "" },
  });
};

exports.postAdminLogin = [
  check("login").trim().notEmpty().withMessage("Phone or Username is required"),
  check("password").notEmpty().withMessage("Password is required"),

  async (req, res) => {
    const errors = validationResult(req);
    const { login, password } = req.body;

    if (!errors.isEmpty()) {
      return res.status(400).render("Admin/adminLogin", {
        pageTitle: "Admin Login",
        errors: errors.array().map(e => e.msg),
        oldInput: { login, password },
      });
    }

    try {
      // 🔥 Only admin allowed
      const admin = await User.findOne({
        $or: [{ username: login }, { phoneNo: login }],
        role: "admin"
      });

      if (!admin || admin.userStatus === "suspended") {
        return res.status(400).render("Admin/adminLogin", {
          pageTitle: "Admin Login",
          errors: [admin ? "Admin account suspended" : "Invalid admin credentials"],
          oldInput: { login, password },
        });
      }

      const match = await bcrypt.compare(password, admin.password);
      if (!match) {
        return res.status(400).render("Admin/adminLogin", {
          pageTitle: "Admin Login",
          errors: ["Invalid admin credentials"],
          oldInput: { login, password },
        });
      }

      // ✅ Admin Session
      // ✅ Session + role-based redirect
      req.session.isLoggedIn = true;
      req.session.admin = {
        _id: admin._id.toString(),
        username: admin.username,
        role: admin.role
      };

      await req.session.save();
      res.redirect("/admin/dashboard");

    } catch (err) {
      console.error(err);
      res.status(500).render("Admin/adminLogin", {
        pageTitle: "Admin Login",
        errors: ["Something went wrong"],
        oldInput: { login, password },
      });
    }
  }
];



exports.getAdminDashboard = async (req, res) => {
  try {
    if (!req.session.isLoggedIn || req.session.admin.role !== "admin") {
      return res.redirect("/login");
    }

    const admin = await User.findOne({
      _id: req.session.admin._id,
      role: "admin",
      userStatus: "active"
    });

    if (!admin) {
      req.session.destroy();
      return res.redirect("/login");
    }

    const totalUsers = await User.countDocuments({ role: "user" });
    const blockedUsers = await User.countDocuments({ userStatus: "suspended" });

    res.render("Admin/admindashbord", {
      pageTitle: "Admin Dashboard",
      admin,
      totalUsers,
      blockedUsers,
      isLoggedIn: req.session.isLoggedIn
    });

  } catch (err) {
    console.error("Admin Dashboard Error:", err);
    res.redirect("/admin/login");
  }
};


exports.getAllUsersPage = async (req, res) => {
  try {
    // 🔐 Admin check
    if (!req.session.isLoggedIn || req.session.admin.role !== "admin") {
      return res.redirect("/admin/login");
    }

    // 🧠 Admin verify
    const admin = await User.findOne({
      _id: req.session.admin._id,
      role: "admin",
      userStatus: "active",
    });

    if (!admin) {
      req.session.destroy();
      return res.redirect("/admin/login");
    }

    // 👥 Fetch all normal users (not admin)
    const users = await User.find({ role: "user" }).sort({ createdAt: -1 });

    // 📊 Wallet summary for each user
    const usersWithStats = await Promise.all(
      users.map(async (user) => {
        const totalCredit = await WalletTransaction.aggregate([
          { $match: { user: user._id, type: "credit", status: "success" } },
          { $group: { _id: null, total: { $sum: "$amount" } } },
        ]);

        const totalDebit = await WalletTransaction.aggregate([
          { $match: { user: user._id, type: "debit", status: "success" } },
          { $group: { _id: null, total: { $sum: "$amount" } } },
        ]);

        return {
          ...user.toObject(),
          totalCredit: totalCredit[0]?.total || 0,
          totalDebit: totalDebit[0]?.total || 0,
        };
      })
    );

    res.render("Admin/adminallUser", {
      pageTitle: "All Users",
      admin,
      users: usersWithStats,
      isLoggedIn: req.session.isLoggedIn
    });

  } catch (error) {
    console.error("All Users Page Error:", error);
    res.redirect("/admin/dashboard");
  }
};

exports.toggleUserStatus = async (req, res) => {
  try {
    if (!req.session.isLoggedIn || req.session.admin.role !== "admin") {
      return res.status(403).json({ success: false });
    }

    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ success: false });

    user.userStatus = user.userStatus === "active" ? "suspended" : "active";
    await user.save();

    res.json({
      success: true,
      newStatus: user.userStatus,
    });

  } catch (err) {
    res.status(500).json({ success: false });
  }
};



exports.updateWallet = async (req, res) => {
  try {
        if (!req.session.isLoggedIn || req.session.admin.role !== "admin") {
      return res.status(403).json({ success: false });
    }
    const { userId, amount, type } = req.body;

    const user = await User.findById(userId);
    if (!user) return res.json({ success: false });

    const oldBalance = user.wallet;

    if (type === "credit") user.wallet += Number(amount);
    else user.wallet -= Number(amount);

    await user.save();

    await WalletTransaction.create({
      user: user._id,
      admin: req.session.user._id,
      type,
      source: type === "credit" ? "admin_credit" : "admin_debit",
      amount,
      oldBalance,
      newBalance: user.wallet,
      status: "success"
    });

    res.json({ success: true });

  } catch (err) {
    res.json({ success: false });
  }
};
