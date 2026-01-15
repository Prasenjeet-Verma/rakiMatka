const { check, validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
const User = require("../model/userSchema");
const WalletTransaction = require("../model/WalletTransaction");
exports.getAdminLoginPage = async (req, res, next) => {
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




exports.toggleUserStatus = async (req, res) => {
  try {
    if (!req.session.isLoggedIn || req.session.admin.role !== "admin") {
      return res.status(403).json({ success: false });
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
    // 1️⃣ Check if admin is logged in
    if (!req.session.isLoggedIn || req.session.admin.role !== "admin") {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    const admin = await User.findById(req.session.admin._id);
    if (!admin || admin.userStatus !== "active") {
      req.session.destroy();
      return res.status(403).json({ success: false });
    }

    const { userId, amount, type, action } = req.body;
    // type = "credit" | "debit" (wallet change)
    // action = "admin" | "user_withdraw" | "deposit" etc. (source)

    const amt = Number(amount);
    if (!amt || amt <= 0) return res.json({ success: false, message: "Invalid amount" });

    const user = await User.findById(userId);
    if (!user) return res.json({ success: false, message: "User not found" });

    let userOld = user.wallet;
    let adminOld = admin.wallet;

    // 2️⃣ Handle wallet logic
    switch (action) {
      case "admin_credit": // Admin adds money to user
        if (admin.wallet < amt)
          return res.json({ success: false, message: "Admin has insufficient balance" });
        user.wallet += amt;
        admin.wallet -= amt;
        break;

      case "admin_debit": // Admin removes money from user
        if (user.wallet < amt)
          return res.json({ success: false, message: "User has insufficient balance" });
        user.wallet -= amt;
        admin.wallet += amt;
        break;

      case "withdraw": // User withdraws money → admin pays
        if (user.wallet < amt)
          return res.json({ success: false, message: "User has insufficient balance" });
        user.wallet -= amt;
        admin.wallet -= amt; // admin gives money to user
        break;

      case "deposit": // User deposits money (payment gateway)
        user.wallet += amt;
        break;

      default:
        return res.json({ success: false, message: "Invalid action type" });
    }

    // 3️⃣ Save wallets
    await user.save();
    await admin.save();

    // 4️⃣ Record wallet transaction for user
    await WalletTransaction.create({
      user: user._id,
      admin: action.startsWith("admin") ? admin._id : null,
      type,
      source: action,
      amount: amt,
      oldBalance: userOld,
      newBalance: user.wallet,
      adminOldBalance: adminOld,
      adminNewBalance: admin.wallet,
      status: "success",
      remark:
        action === "withdraw"
          ? `User withdraws ${amt} from wallet`
          : action === "deposit"
            ? `User deposits ${amt}`
            : `Admin ${type} ${amt} to user ${user.username}`,
    });

    return res.json({ success: true, message: "Wallet updated successfully" });
  } catch (err) {
    console.error("Wallet update failed:", err);
    return res.json({ success: false, message: "Update failed, try again" });
  }
};

// Render variables dono ka same rhna chahiye 
exports.getAllUsersPage = async (req, res) => {
  try {
    if (!req.session.isLoggedIn || req.session.admin.role !== "admin") {
      return res.redirect("/admin/login");
    }

    const admin = await User.findOne({
      _id: req.session.admin._id,
      role: "admin",
      userStatus: "active",
    });

    if (!admin) {
      req.session.destroy();
      return res.redirect("/admin/login");
    }

    const page = parseInt(req.query.page) || 1;
    const limit = req.query.limit === "all" ? 0 : parseInt(req.query.limit) || 10;
    const skip = limit === 0 ? 0 : (page - 1) * limit;

    const search = req.query.search || "";

    // 🔍 Search filter
    const filter = {
      role: "user",
      ...(search && {
        username: { $regex: search, $options: "i" }
      })
    };

    // Count after search
    const totalUsers = await User.countDocuments(filter);

    // Fetch users
    const users = await User.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit === 0 ? totalUsers : limit);

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

    const totalPages = limit === 0 ? 1 : Math.ceil(totalUsers / limit);

    res.render("Admin/adminallUser", {
      pageTitle: "All Users",
      admin,
      users: usersWithStats,
      errors: [],
      oldInput: {},
      isLoggedIn: req.session.isLoggedIn,
      currentPage: page,
      totalPages,
      limit,
      totalUsers,
      search // 👈 pass back to view
    });

  } catch (error) {
    console.error("All Users Page Error:", error);
    res.redirect("/admin/dashboard");
  }
};

exports.adminCreateUser = async (req, res) => {
  try {
    if (!req.session.isLoggedIn || !req.session.admin || req.session.admin.role !== "admin") {
      return res.redirect("/admin/login");
    }

    const admin = await User.findById(req.session.admin._id);
    if (!admin || admin.userStatus !== "active") {
      req.session.destroy();
      return res.redirect("/admin/login");
    }

    const page = parseInt(req.query.page) || 1;
    const limit = req.query.limit === "all" ? 0 : parseInt(req.query.limit) || 10;
    const skip = limit === 0 ? 0 : (page - 1) * limit;
    const search = req.query.search || "";

    // 🔍 same filter as getAllUsersPage
    const filter = {
      role: "user",
      ...(search && {
        username: { $regex: search, $options: "i" }
      })
    };

    const totalUsers = await User.countDocuments(filter);
    const totalPages = limit === 0 ? 1 : Math.ceil(totalUsers / limit);

    const users = await User.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit === 0 ? totalUsers : limit);

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

    const { username, phoneNo, password, wallet } = req.body;
    const errors = [];

    if (!username) errors.push("Username is required");
    if (!phoneNo) errors.push("Phone number is required");
    if (!password) errors.push("Password is required");
    if (password && password.length < 6) errors.push("Password must be at least 6 characters");

    const existingUser = await User.findOne({
      $or: [{ username }, { phoneNo }],
    });

    if (existingUser) errors.push("Username or phone number already exists");

    if (errors.length > 0) {
      return res.status(400).render("Admin/adminallUser", {
        pageTitle: "Create User",
        admin,
        users: usersWithStats,
        isLoggedIn: req.session.isLoggedIn,
        errors,
        oldInput: { username, phoneNo, wallet },
        currentPage: page,
        totalPages,
        limit,
        totalUsers,
        search   // 👈 keep search
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    await new User({
      username,
      phoneNo,
      password: hashedPassword,
      wallet: Number(wallet) || 0,
      role: "user",
      userStatus: "active",
    }).save();

    // 🔥 redirect with search preserved
    res.redirect(`/admin/allUsers?page=${page}&limit=${limit === 0 ? "all" : limit}&search=${search}`);

  } catch (err) {
    console.error("Admin Create Error:", err);
    res.redirect("/admin/allUsers");
  }
};
//End


exports.getSingleUserDetails = async (req, res) => {
  try {
    // 🔐 Admin auth check
    if (!req.session.isLoggedIn || !req.session.admin || req.session.admin.role !== "admin") {
      return res.redirect("/admin/login");
    }

    const admin = await User.findOne({
      _id: req.session.admin._id,
      role: "admin",
      userStatus: "active"
    });

    if (!admin) {
      req.session.destroy();
      return res.redirect("/admin/login");
    }

    const userId = req.params.userId;

    // 👤 Get user
    const user = await User.findById(userId);
    if (!user) {
      return res.redirect("/admin/allUsers");
    }

    // 💰 TOTAL DEPOSIT (all money coming into user wallet)
    const depositAgg = await WalletTransaction.aggregate([
      {
        $match: {
          user: user._id,
          source: { $in: ["admin_credit", "deposit", "refund"] },
          status: "success"
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$amount" }
        }
      }
    ]);

    // 💸 TOTAL WITHDRAW (all money going out from user wallet)
    const withdrawAgg = await WalletTransaction.aggregate([
      {
        $match: {
          user: user._id,
          source: { $in: ["admin_debit", "withdraw"] },
          status: "success"
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$amount" }
        }
      }
    ]);

    const totalDeposit = depositAgg[0]?.total || 0;
    const totalWithdraw = withdrawAgg[0]?.total || 0;



    // 🧾 Last 50 Transactions
    const transactions = await WalletTransaction.find({ user: user._id })
      .populate("admin", "username phoneNo")
      .sort({ createdAt: -1 })
      .limit(50);

    // 📤 Send to page
    res.render("Admin/singleUserDetails", {
      pageTitle: "User Details",
      admin,
      user,
      walletBalance: user.wallet,
      totalDeposit,
      totalWithdraw,
      transactions,
      isLoggedIn: req.session.isLoggedIn
    });

  } catch (error) {
    console.error("Single User Details Error:", error);
    res.redirect("/admin/allUsers");
  }
};

exports.changeUserPassword = async (req, res) => {
  try {
    if (!req.session.isLoggedIn || req.session.admin.role !== "admin") {
      return res.redirect("/admin/login");
    }

    const { userId, newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.redirect("/admin/singleuser-details/" + userId);
    }

    const hashed = await bcrypt.hash(newPassword, 12);

    await User.findByIdAndUpdate(userId, {
      password: hashed
    });

    res.redirect("/admin/singleuser-details/" + userId);

  } catch (err) {
    console.log("Password change error:", err);
    res.redirect("/admin/singleuser-details/" + userId);
  }
};
