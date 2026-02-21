const mongoose = require("mongoose");
const { check, validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
const User = require("../model/userSchema");
const admin = require("../config/firebase");
const WalletTransaction = require("../model/WalletTransaction");
const UserBankDetails = require("../model/UserBankDetails");
const moment = require("moment-timezone");
const { DateTime } = require("luxon");
const Game = require("../model/Game");
const GameRate = require("../model/GameRate");
const GameResult = require("../model/GameResult");
const { isGameOpenNow } = require("../utils/gameStatus");
// const Notification = require("../model/bellNotification");
const bellNotification = require("../model/normalNotification");
const SingleDigitBet = require("../model/SingleDigitBet");
const SingleBulkDigitBet = require("../model/SingleBulkDigitBet");
const JodiDigitBet = require("../model/JodiDigitBet");
const JodiDigitBulkBet = require("../model/JodiDigitBulkBet");
const SinglePannaBet = require("../model/SinglePannaBet");
const SinglePannaBulkBet = require("../model/SinglePannaBulkBet");
const DoublePannaBet = require("../model/DoublePannaBet");
const DoublePannaBulkBet = require("../model/DoublePannaBulkBet");
const TriplePannaBet = require("../model/TriplePannaBet");
const OddEvenBet = require("../model/OddEvenBet");
const HalfSangamBet = require("../model/HalfSangamBet");
const FullSangamBet = require("../model/FullSangamBet");
const SPMotorBet = require("../model/SPMotorBet");
const DPMotorBet = require("../model/DPMotorBet");
const spdptpBet = require("../model/spdptpBet");
const RedBracketBet = require("../model/RedBracketBet");
//Jackpot game related models
const JackpotGameResult = require("../model/jackpotGameDeclareResuult");
const LeftDigitBet = require("../model/JackpotLeftDigitBet");
const RightDigitBet = require("../model/JackpotRightDigitBet");
const CenterJodiDigitBet = require("../model/JackpotCentreJodiDigitBet");
// Starline game related models
const StarlineSingleDigitBet = require("../model/StarlineSingleDigitBet");
const StarlineSinglePannaBet = require("../model/StarlineSinglePannaBet");
const StarlineDoublePannaBet = require("../model/StarlineDoublePannaBet");
const StarlineTriplePannaBet = require("../model/StarlineTriplePannaBet");
const starlineGameDeclareResult = require("../model/starlineGameDeclareResult");
const betModels = [
  require("../model/SingleDigitBet"),
  require("../model/SingleBulkDigitBet"),
  require("../model/JodiDigitBet"),
  require("../model/JodiDigitBulkBet"),
  require("../model/SinglePannaBet"),
  require("../model/SinglePannaBulkBet"),
  require("../model/DoublePannaBet"),
  require("../model/DoublePannaBulkBet"),
  require("../model/TriplePannaBet"),
  require("../model/OddEvenBet"),
  require("../model/HalfSangamBet"),
  require("../model/FullSangamBet"),
  require("../model/SPMotorBet"),
  require("../model/DPMotorBet"),
  require("../model/spdptpBet"),
  require("../model/RedBracketBet"),
];
const jackpotBetModels = [
  require("../model/JackpotLeftDigitBet"),
  require("../model/JackpotRightDigitBet"),
  require("../model/JackpotCentreJodiDigitBet"),
];
const starlineBetModels = [
  require("../model/StarlineSingleDigitBet"),
  require("../model/StarlineSinglePannaBet"),
  require("../model/StarlineDoublePannaBet"),
  require("../model/StarlineTriplePannaBet"),
];
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
        errors: errors.array().map((e) => e.msg),
        oldInput: { login, password },
      });
    }

    try {
      // 🔥 Only admin allowed
      const admin = await User.findOne({
        $or: [{ username: login }, { phoneNo: login }],
        role: "admin",
      });

      if (!admin || admin.userStatus === "suspended") {
        return res.status(400).render("Admin/adminLogin", {
          pageTitle: "Admin Login",
          errors: [
            admin ? "Admin account suspended" : "Invalid admin credentials",
          ],
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
        role: admin.role,
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
  },
];

exports.getAdminDashboard = async (req, res) => {
  try {
    if (!req.session.isLoggedIn || req.session.admin.role !== "admin") {
      return res.redirect("/login");
    }

    const admin = await User.findOne({
      _id: req.session.admin._id,
      role: "admin",
      userStatus: "active",
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
      isLoggedIn: req.session.isLoggedIn,
    });
  } catch (err) {
    console.error("Admin Dashboard Error:", err);
    res.redirect("/admin/login");
  }
};

exports.toggleUserStatus = async (req, res) => {
  try {
    if (
      !req.session.isLoggedIn ||
      !req.session.admin ||
      req.session.admin.role !== "admin"
    ) {
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
    if (
      !req.session.isLoggedIn ||
      !req.session.admin ||
      req.session.admin.role !== "admin"
    ) {
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

    const { userId, amount, type, action } = req.body;
    // type = "credit" | "debit" (wallet change)
    // action = "admin" | "user_withdraw" | "deposit" etc. (source)

    const amt = Number(amount);
    if (!amt || amt <= 0)
      return res.json({ success: false, message: "Invalid amount" });

    const user = await User.findById(userId);
    if (!user) return res.json({ success: false, message: "User not found" });

    let userOld = user.wallet;
    let adminOld = admin.wallet;

    // 2️⃣ Handle wallet logic
    switch (action) {
      case "admin_credit": // Admin adds money to user
        if (admin.wallet < amt)
          return res.json({
            success: false,
            message: "Admin has insufficient balance",
          });
        user.wallet += amt;
        admin.wallet -= amt;
        break;

      case "admin_debit": // Admin removes money from user
        if (user.wallet < amt)
          return res.json({
            success: false,
            message: "User has insufficient balance",
          });
        user.wallet -= amt;
        admin.wallet += amt;
        break;

      case "withdraw": // User withdraws money → admin pays
        if (user.wallet < amt)
          return res.json({
            success: false,
            message: "User has insufficient balance",
          });
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
    res.json({ success: false, message: "Update failed, try again" });
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
    const limit =
      req.query.limit === "all" ? 0 : parseInt(req.query.limit) || 10;
    const skip = limit === 0 ? 0 : (page - 1) * limit;

    const search = req.query.search || "";

    // 🔍 Search filter
    const filter = {
      role: "user",
      ...(search && {
        username: { $regex: search, $options: "i" },
      }),
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
      }),
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
      search, // 👈 pass back to view
    });
  } catch (error) {
    console.error("All Users Page Error:", error);
    res.redirect("/admin/dashboard");
  }
};

exports.adminCreateUser = async (req, res) => {
  try {
    if (
      !req.session.isLoggedIn ||
      !req.session.admin ||
      req.session.admin.role !== "admin"
    ) {
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
    const limit =
      req.query.limit === "all" ? 0 : parseInt(req.query.limit) || 10;
    const skip = limit === 0 ? 0 : (page - 1) * limit;
    const search = req.query.search || "";

    // 🔍 same filter as getAllUsersPage
    const filter = {
      role: "user",
      ...(search && {
        username: { $regex: search, $options: "i" },
      }),
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
      }),
    );

    const { username, phoneNo, password, wallet } = req.body;
    const errors = [];

    if (!username) errors.push("Username is required");
    if (!phoneNo) errors.push("Phone number is required");
    if (!password) errors.push("Password is required");
    if (password && password.length < 6)
      errors.push("Password must be at least 6 characters");

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
        search, // 👈 keep search
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
    return res.redirect(
      `/admin/allUsers?page=${page}&limit=${limit === 0 ? "all" : limit}&search=${search}`,
    );
  } catch (err) {
    console.error("Admin Create Error:", err);
    res.redirect("/admin/allUsers");
  }
};
//End

exports.getSingleUserDetails = async (req, res) => {
  try {
    // 🔐 Admin auth check
    if (
      !req.session.isLoggedIn ||
      !req.session.admin ||
      req.session.admin.role !== "admin"
    ) {
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

    const userId = req.params.userId;

    // 👤 Get user
    const user = await User.findById(userId);
    if (!user) {
      return res.redirect("/admin/allUsers");
    }

    // 🏦 Get bank details
    const bankDetails = await UserBankDetails.findOne({ user: user._id });

    // 💰 TOTAL DEPOSIT (all money coming into user wallet)
    const depositAgg = await WalletTransaction.aggregate([
      {
        $match: {
          user: user._id,
          source: { $in: ["admin_credit", "deposit", "refund"] },
          status: "success",
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$amount" },
        },
      },
    ]);

    // 💸 TOTAL WITHDRAW (all money going out from user wallet)
    const withdrawAgg = await WalletTransaction.aggregate([
      {
        $match: {
          user: user._id,
          source: { $in: ["admin_debit", "withdraw"] },
          status: "success",
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$amount" },
        },
      },
    ]);

    const totalDeposit = depositAgg[0]?.total || 0;
    const totalWithdraw = withdrawAgg[0]?.total || 0;

    // 🧾 Last 50 Transactions
    const transactions = await WalletTransaction.find({ user: user._id })
      .populate("admin", "username phoneNo")
      .sort({ createdAt: -1 })
      .limit(50);

    // ===================== WITHDRAW LIST PAGINATION =====================

    // query params
    const withdrawPage = parseInt(req.query.withdrawPage) || 1;
    const withdrawLimit =
      req.query.withdrawLimit === "all"
        ? null
        : parseInt(req.query.withdrawLimit) || 10;

    const withdrawSearch = req.query.withdrawSearch || "";
    const withdrawStatus = req.query.withdrawStatus || "all";

    // withdraw condition (USER VIEW)
    const withdrawBaseMatch = {
      user: user._id,
      source: { $in: ["withdraw", "admin_debit"] },
    };

    // ✅ STATUS FILTER
    if (withdrawStatus !== "all") {
      withdrawBaseMatch.status = withdrawStatus;
    }

    // 🔍 username / mobile search
    let withdrawUserFilter = {};
    if (withdrawSearch) {
      withdrawUserFilter = {
        $or: [
          { "userData.username": { $regex: withdrawSearch, $options: "i" } },
          { "userData.phoneNo": { $regex: withdrawSearch, $options: "i" } },
        ],
      };
    }

    // aggregation
    const withdrawAggPipeline = [
      { $match: withdrawBaseMatch },
      {
        $lookup: {
          from: "users",
          localField: "user",
          foreignField: "_id",
          as: "userData",
        },
      },
      { $unwind: "$userData" },
      ...(withdrawSearch ? [{ $match: withdrawUserFilter }] : []),
      { $sort: { createdAt: -1 } },
    ];

    // total count
    const withdrawCountAgg = await WalletTransaction.aggregate([
      ...withdrawAggPipeline,
      { $count: "total" },
    ]);

    const withdrawTotalRecords = withdrawCountAgg[0]?.total || 0;

    // pagination
    if (withdrawLimit) {
      withdrawAggPipeline.push(
        { $skip: (withdrawPage - 1) * withdrawLimit },
        { $limit: withdrawLimit },
      );
    }

    const withdrawTransactions =
      await WalletTransaction.aggregate(withdrawAggPipeline);

    const withdrawTotalPages = withdrawLimit
      ? Math.ceil(withdrawTotalRecords / withdrawLimit)
      : 1;

    // ====================================================================End

    // 📤 Send to page
    res.render("Admin/singleUserDetails", {
      pageTitle: "User Details",
      admin,
      user,
      bankDetails, // ✅ NOW AVAILABLE
      walletBalance: user.wallet,
      totalDeposit,
      totalWithdraw,
      transactions,
      // 🔽 NEW (withdraw table only)
      withdrawTransactions,
      withdrawPage,
      withdrawLimit: withdrawLimit || "all",
      withdrawSearch,
      withdrawTotalPages,
      withdrawTotalRecords,
      withdrawStatus,
      isLoggedIn: req.session.isLoggedIn,
    });
  } catch (error) {
    console.error("Single User Details Error:", error);
    res.redirect("/admin/allUsers");
  }
};

exports.changeUserPassword = async (req, res, next) => {
  try {
    if (
      !req.session.isLoggedIn ||
      !req.session.admin ||
      req.session.admin.role !== "admin"
    ) {
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

    const { userId, newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.redirect("/admin/singleuser-details/" + userId);
    }

    const hashed = await bcrypt.hash(newPassword, 12);

    await User.findByIdAndUpdate(userId, {
      password: hashed,
    });

    return res.redirect("/admin/singleuser-details/" + userId);
  } catch (err) {
    console.log("Password change error:", err);
    res.redirect("/admin/singleuser-details/" + userId);
  }
};

// Game Controller Related Codes Start Here
exports.getAdminCreateGamePage = async (req, res) => {
  try {
    if (
      !req.session.isLoggedIn ||
      !req.session.admin ||
      req.session.admin.role !== "admin"
    ) {
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

    // Pagination params
    const page = parseInt(req.query.page) || 1; // current page
    const limit = parseInt(req.query.limit) || 10; // rows per page
    const skip = (page - 1) * limit;

    const totalGames = await Game.countDocuments({
      isDeleted: false,
      isStarline: false,
      isJackpot: false,
    });
    const totalPages = Math.ceil(totalGames / limit);

    const games = await Game.find({
      isDeleted: false,
      isStarline: false,
      isJackpot: false,
    })
      .skip(skip)
      .limit(limit)
      .lean();

    const gamesWithStatus = games.map((game) => ({
      ...game,
      isOpenNow: isGameOpenNow(game),
    }));

    res.render("Admin/adminGameProviders", {
      pageTitle: "Create Game Provider",
      admin,
      games: gamesWithStatus,
      page,
      totalPages,
      limit,
      isLoggedIn: req.session.isLoggedIn,
    });
  } catch (err) {
    console.error(err);
    res.redirect("/admin/dashboard");
  }
};

exports.getAdminCreateMainStarlineGamePage = async (req, res) => {
  try {
    if (
      !req.session.isLoggedIn ||
      !req.session.admin ||
      req.session.admin.role !== "admin"
    ) {
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

    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // ⭐ ONLY STARLINE GAMES
    const totalGames = await Game.countDocuments({
      isDeleted: false,
      isStarline: true,
    });

    const totalPages = Math.ceil(totalGames / limit);

    const games = await Game.find({
      isDeleted: false,
      isStarline: true,
    })
      .skip(skip)
      .limit(limit)
      .lean();

    const gamesWithStatus = games.map((game) => ({
      ...game,
      isOpenNow: isGameOpenNow(game),
    }));

    res.render("Admin/MainStarlineGame", {
      pageTitle: "Create Starline Game",
      admin,
      games: gamesWithStatus,
      page,
      totalPages,
      limit,
      isLoggedIn: req.session.isLoggedIn,
    });
  } catch (err) {
    console.error(err);
    res.redirect("/admin/dashboard");
  }
};

exports.getAdminCreateMainJackpotGamePage = async (req, res) => {
  try {
    if (
      !req.session.isLoggedIn ||
      !req.session.admin ||
      req.session.admin.role !== "admin"
    ) {
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

    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // 🎰 ONLY JACKPOT GAMES
    const filter = {
      isDeleted: false,
      isJackpot: true,
    };

    const totalGames = await Game.countDocuments(filter);
    const totalPages = Math.ceil(totalGames / limit);

    const games = await Game.find(filter).skip(skip).limit(limit).lean();

    const gamesWithStatus = games.map((game) => ({
      ...game,
      isOpenNow: isGameOpenNow(game),
    }));

    res.render("Admin/MainJackpotGame", {
      pageTitle: "Create Jackpot Game",
      admin,
      games: gamesWithStatus,
      page,
      totalPages,
      limit,
      isLoggedIn: req.session.isLoggedIn,
    });
  } catch (err) {
    console.error(err);
    res.redirect("/admin/dashboard");
  }
};

exports.postAddGame = async (req, res) => {
  try {
    if (
      !req.session.isLoggedIn ||
      !req.session.admin ||
      req.session.admin.role !== "admin"
    ) {
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

    const { type } = req.params; // normal | starline | jackpot
    const { gameName, openTime, closeTime } = req.body;

    const istDay = moment().tz("Asia/Kolkata").format("dddd");

    const defaultSchedule = {
      openTime,
      closeTime,
      isActive: true,
    };

    const game = new Game({
      gameName,
      isStarline: type === "starline", // ⭐ Starline
      isJackpot: type === "jackpot", // 🎰 Jackpot
      createdDay: istDay,
      schedule: {
        monday: { ...defaultSchedule },
        tuesday: { ...defaultSchedule },
        wednesday: { ...defaultSchedule },
        thursday: { ...defaultSchedule },
        friday: { ...defaultSchedule },
        saturday: { ...defaultSchedule },
        sunday: { ...defaultSchedule },
      },
    });

    await game.save();

    // 🔁 Redirect based on type
    if (type === "starline") {
      return res.redirect("/admin/CreateMainStarlineGame");
    }

    if (type === "jackpot") {
      return res.redirect("/admin/CreateMainJackpotGame");
    }

    return res.redirect("/admin/CreateGame"); // normal
  } catch (err) {
    console.error(err);
    return res.redirect("/admin/CreateGame");
  }
};

// ====================== UPDATE SINGLE DAY ======================
exports.updateSingleDay = async (req, res) => {
  try {
    if (
      !req.session.isLoggedIn ||
      !req.session.admin ||
      req.session.admin.role !== "admin"
    ) {
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

    const { gameId, type } = req.params; // normal | starline | jackpot
    const { day, openTime, closeTime, isActive } = req.body;

    const game = await Game.findById(gameId);
    if (!game || !day || !game.schedule?.[day]) {
      return res.redirect("/admin/CreateGame");
    }

    // 🔄 Update only provided fields
    if (openTime) game.schedule[day].openTime = openTime;
    if (closeTime) game.schedule[day].closeTime = closeTime;
    game.schedule[day].isActive = isActive === "Yes";

    await game.save();

    // 🔁 Redirect based on game type
    if (type === "starline") {
      return res.redirect("/admin/CreateMainStarlineGame");
    }

    if (type === "jackpot") {
      return res.redirect("/admin/CreateMainJackpotGame");
    }

    return res.redirect("/admin/CreateGame"); // normal
  } catch (error) {
    console.error(error);
    return res.redirect("/admin/CreateGame");
  }
};

// ====================== UPDATE ALL DAYS ======================
exports.updateAllDays = async (req, res) => {
  try {
    if (
      !req.session.isLoggedIn ||
      !req.session.admin ||
      req.session.admin.role !== "admin"
    ) {
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

    const { gameId, type } = req.params; // normal | starline | jackpot
    const { openTime, closeTime, isActive } = req.body;

    const game = await Game.findById(gameId);
    if (!game || !game.schedule) {
      return res.redirect("/admin/CreateGame");
    }

    const days = [
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
      "sunday",
    ];

    days.forEach((day) => {
      if (!game.schedule[day]) return;

      if (openTime) game.schedule[day].openTime = openTime;
      if (closeTime) game.schedule[day].closeTime = closeTime;
      game.schedule[day].isActive = isActive === "Yes";
    });

    await game.save();

    // 🔁 Redirect based on game type
    if (type === "starline") {
      return res.redirect("/admin/CreateMainStarlineGame");
    }

    if (type === "jackpot") {
      return res.redirect("/admin/CreateMainJackpotGame");
    }

    return res.redirect("/admin/CreateGame"); // normal
  } catch (err) {
    console.error(err);
    return res.redirect("/admin/CreateGame");
  }
};

exports.deleteGame = async (req, res) => {
  try {
    if (
      !req.session.isLoggedIn ||
      !req.session.admin ||
      req.session.admin.role !== "admin"
    ) {
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

    const { gameId, type } = req.params; // normal | starline | jackpot

    await Game.findByIdAndUpdate(gameId, { isDeleted: true });

    // 🔁 Redirect based on game type
    if (type === "starline") {
      return res.redirect("/admin/CreateMainStarlineGame");
    }

    if (type === "jackpot") {
      return res.redirect("/admin/CreateMainJackpotGame");
    }

    return res.redirect("/admin/CreateGame"); // normal
  } catch (err) {
    console.error(err);
    return res.redirect("/admin/CreateGame");
  }
};

exports.getAdminGameRatesPage = async (req, res, next) => {
  try {
    if (
      !req.session.isLoggedIn ||
      !req.session.admin ||
      req.session.admin.role !== "admin"
    ) {
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

    const type = req.query.type || "main";

    /* 🔥 Select Correct Model Group */
    let selectedModels;

    if (type === "starline") {
      selectedModels = starlineBetModels;
    } else if (type === "jackpot") {
      selectedModels = jackpotBetModels;
    } else {
      selectedModels = betModels;
    }

    /* ✅ Extract gameTypes dynamically */
    const gameTypes = selectedModels
      .map((model) => model.schema.obj.gameType?.default)
      .filter(Boolean);

    const uniqueGameTypes = [...new Set(gameTypes)];

    /* ✅ Filter GameRates Based On Page Type */
    let filter = {};

    if (type === "starline") {
      filter = { isStarline: true };
    } else if (type === "jackpot") {
      filter = { isJackpot: true };
    } else {
      filter = { isStarline: false, isJackpot: false };
    }

    const gameRates = await GameRate.find(filter);

    res.render("Admin/gameRates", {
      admin,
      gameRates,
      gameTypes: uniqueGameTypes,
      selectedType: type,
      isLoggedIn: req.session.isLoggedIn,
      pageTitle: "Game Rates",
    });
  } catch (err) {
    console.error(err);
    return res.redirect("/admin/dashboard");
  }
};

exports.postGameRates = async (req, res, next) => {
  try {
    if (
      !req.session.isLoggedIn ||
      !req.session.admin ||
      req.session.admin.role !== "admin"
    ) {
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

    const { gameType, betAmount, profitAmount } = req.body;
    const type = req.query.type || "main";

    /* ✅ Decide Flags Based On Page */
    let isStarline = false;
    let isJackpot = false;

    if (type === "starline") {
      isStarline = true;
    } else if (type === "jackpot") {
      isJackpot = true;
    }

    const newGameRate = new GameRate({
      gameType,
      betAmount,
      profitAmount,
      isStarline,
      isJackpot,
    });

    await newGameRate.save();

    return res.redirect(`/admin/GameRates?type=${type}`);
  } catch (err) {
    console.error(err);
    return res.redirect("/admin/dashboard");
  }
};

exports.toggleGameRate = async (req, res) => {
  try {
    if (
      !req.session.isLoggedIn ||
      !req.session.admin ||
      req.session.admin.role !== "admin"
    ) {
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

    const rate = await GameRate.findById(req.params.id);
    if (!rate) {
      return res.redirect("/admin/GameRates");
    }

    rate.isActive = !rate.isActive;
    await rate.save();

    const type = req.query.type || "main";

    return res.redirect(`/admin/GameRates?type=${type}`);
  } catch (err) {
    console.error(err);
    return res.redirect("/admin/dashboard");
  }
};

exports.deleteGameRate = async (req, res) => {
  try {
    if (
      !req.session.isLoggedIn ||
      !req.session.admin ||
      req.session.admin.role !== "admin"
    ) {
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

    await GameRate.findByIdAndDelete(req.params.id);

    const type = req.query.type || "main";

    return res.redirect(`/admin/GameRates?type=${type}`);
  } catch (err) {
    console.error(err);
    return res.redirect("/admin/dashboard");
  }
};

exports.updateGameRate = async (req, res) => {
  try {
    if (
      !req.session.isLoggedIn ||
      !req.session.admin ||
      req.session.admin.role !== "admin"
    ) {
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

    const { id } = req.params;
    let { gameType, betAmount, profitAmount } = req.body;

    if (!gameType || !betAmount || !profitAmount) {
      return res.status(400).send("All fields required");
    }

    betAmount = Number(betAmount);
    profitAmount = Number(profitAmount);

    await GameRate.findByIdAndUpdate(id, {
      gameType: gameType.trim(),
      betAmount,
      profitAmount,
    });

    const type = req.query.type || "main";

    return res.redirect(`/admin/GameRates?type=${type}`);
  } catch (error) {
    console.error(error);
    return res.status(500).send("Server Error");
  }
};

exports.gameResult = async (req, res) => {
  try {
    if (
      !req.session.isLoggedIn ||
      !req.session.admin ||
      req.session.admin.role !== "admin"
    ) {
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

    // ✅ Today date in IST
    const todayDate = DateTime.now()
      .setZone("Asia/Kolkata")
      .toFormat("yyyy-MM-dd");

    // fetch today's results
    const results = await GameResult.find({
      resultDate: todayDate,
    }).sort({ createdAt: 1 });

    // 🔥 GROUP BY gameName
    const groupedResults = {};

    results.forEach((r) => {
      if (!groupedResults[r.gameName]) {
        groupedResults[r.gameName] = {
          gameName: r.gameName,
          resultDate: r.resultDate,
          open: null,
          close: null,
        };
      }

      if (r.session === "OPEN") groupedResults[r.gameName].open = r;
      if (r.session === "CLOSE") groupedResults[r.gameName].close = r;
    });

    res.render("Admin/adminGameResult", {
      pageTitle: "Admin Game Result",
      admin,
      isLoggedIn: req.session.isLoggedIn,
      todayResults: Object.values(groupedResults),
    });
  } catch (err) {
    console.error("Admin Game Result Error:", err);
    res.redirect("/admin/login");
  }
};

/* =====================================================
   🔹 GET PENDING GAMES (SESSION AWARE)
   ===================================================== */
exports.getPendingGames = async (req, res) => {
  try {
    // --------- ADMIN AUTH ----------
    if (
      !req.session.isLoggedIn ||
      !req.session.admin ||
      req.session.admin.role !== "admin"
    ) {
      return res.redirect("/admin/login");
    }

    // --------- SELECTED DATE ----------
    const dateParam = req.query.date; // from frontend ?date=YYYY-MM-DD
    const date = dateParam
      ? DateTime.fromISO(dateParam, { zone: "Asia/Kolkata" })
      : DateTime.now().setZone("Asia/Kolkata");

    const selectedDate = date.toFormat("yyyy-MM-dd");
    const selectedDay = date.toFormat("cccc").toLowerCase(); // monday

    // --------- ACTIVE GAMES ON THAT DAY ----------
    const games = await Game.find({
      isDeleted: false,
      isStarline: false, // only normal games
      isJackpot: false, // exclude jackpot games
      [`schedule.${selectedDay}.isActive`]: true,
    }).select("gameName");

    const allGameNames = games.map((g) => g.gameName);

    // --------- ALREADY DECLARED RESULTS ON THAT DATE ----------
    const declaredResults = await GameResult.find({
      resultDate: selectedDate,
    }).select("gameName session");

    const resultMap = {};
    declaredResults.forEach((r) => {
      if (!resultMap[r.gameName]) resultMap[r.gameName] = new Set();
      resultMap[r.gameName].add(r.session);
    });

    // --------- FILTER PENDING GAMES ----------
    const pendingGames = allGameNames.filter((gameName) => {
      const sessionsDone = resultMap[gameName];
      // no result at all
      if (!sessionsDone) return true;
      // missing OPEN or CLOSE
      return !(sessionsDone.has("OPEN") && sessionsDone.has("CLOSE"));
    });

    return res.json({ success: true, games: pendingGames });
  } catch (err) {
    console.error("Pending game fetch error:", err);
    return res.status(500).json({ success: false });
  }
};

exports.declareGameResult = async (req, res) => {
  try {
    /* ================= ADMIN AUTH ================= */
    if (
      !req.session.isLoggedIn ||
      !req.session.admin ||
      req.session.admin.role !== "admin"
    ) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const admin = await User.findOne({
      _id: req.session.admin._id,
      role: "admin",
      userStatus: "active",
    });

    if (!admin) {
      req.session.destroy();
      return res
        .status(401)
        .json({ success: false, message: "Session expired" });
    }

    /* ================= REQUEST DATA ================= */
    const { gameName, session, panna, digit, resultDate } = req.body;

    if (!gameName || !session || !panna || !digit || !resultDate) {
      return res
        .status(400)
        .json({ success: false, message: "Missing required fields" });
    }

    // --------- PARSE DATE IN IST ----------
    const ist = DateTime.fromISO(resultDate, { zone: "Asia/Kolkata" });
    const formattedDate = ist.toFormat("yyyy-MM-dd");
    const formattedTime = ist.toFormat("HH:mm");
    const weekday = ist.toFormat("cccc");

    // --------- CREATE IST-SAFE Date object for createdAt ----------
    const createdAtIST = new Date(
      ist.year,
      ist.month - 1, // JS months are 0-indexed
      ist.day,
      ist.hour,
      ist.minute,
      ist.second,
      ist.millisecond,
    );

    /* ================= DUPLICATE RESULT CHECK ================= */
    const existingResult = await GameResult.findOne({
      gameName,
      session,
      resultDate: formattedDate,
    });

    if (existingResult) {
      return res.status(400).json({
        success: false,
        message: "Result already declared for this game/session/date",
      });
    }

    // --------- SAVE RESULT ----------
    await GameResult.create({
      gameName,
      session,
      panna,
      digit,
      resultDate: formattedDate,
      resultTime: formattedTime,
      resultWeekday: weekday,
      createdAt: createdAtIST,
    });

    /* =====================================================
   🔥 DOUBLE PANNA RESULT SETTLEMENT (OPEN / CLOSE INDEPENDENT)
===================================================== */

    const bets = await DoublePannaBet.find({
      gameName,
      playedDate: formattedDate,
      "bets.resultStatus": "PENDING",
    }).populate("userId");

    for (const bet of bets) {
      let totalWinAmount = 0;

      bet.bets.forEach((item) => {
        if (item.resultStatus !== "PENDING") return;

        /* ================= 🟡 OPEN SESSION ================= */
        if (session === "OPEN" && item.mode === "OPEN") {
          if (item.underNo === panna) {
            // ✅ OPEN WIN
            item.resultStatus = "WIN";
            item.winAmount = item.gameRateWinAmount; // 👈 Direct set
            totalWinAmount += item.winAmount;
          } else {
            // ❌ OPEN LOSS
            item.resultStatus = "LOSS";
            item.winAmount = 0;
          }
        }

        /* ================= 🔴 CLOSE SESSION ================= */
        if (session === "CLOSE" && item.mode === "CLOSE") {
          if (item.underNo === panna) {
            // ✅ CLOSE WIN
            item.resultStatus = "WIN";
            item.winAmount = item.gameRateWinAmount; // 👈 Direct set
            totalWinAmount += item.winAmount;
          } else {
            // ❌ CLOSE LOSS
            item.resultStatus = "LOSS";
            item.winAmount = 0;
          }
        }
      });

      /* ================= 💰 WALLET UPDATE (SAME SESSION) ================= */
      if (totalWinAmount > 0) {
        bet.userId.wallet += totalWinAmount;
        await bet.userId.save();

        bet.afterWallet = bet.userId.wallet;
        bet.winningPanna = panna;
      }

      await bet.save();
    }

    /* =====================================================
   🔥 SINGLE PANNA RESULT SETTLEMENT (OPEN / CLOSE INDEPENDENT)
===================================================== */

    const singlePannaBets = await SinglePannaBet.find({
      gameName,
      playedDate: formattedDate,
      "bets.resultStatus": "PENDING",
    }).populate("userId");

    for (const bet of singlePannaBets) {
      let totalWinAmount = 0;

      bet.bets.forEach((item) => {
        if (item.resultStatus !== "PENDING") return;

        /* 🟡 OPEN SESSION RESULT */
        if (session === "OPEN" && item.mode === "OPEN") {
          if (item.underNo === panna) {
            // ✅ OPEN WIN
            item.resultStatus = "WIN";
            item.winAmount = item.gameRateWinAmount; // 👈 Direct set
            totalWinAmount += item.winAmount;
          } else {
            // ❌ OPEN LOSS
            item.resultStatus = "LOSS";
            item.winAmount = 0;
          }
        }

        /* 🔴 CLOSE SESSION RESULT */
        if (session === "CLOSE" && item.mode === "CLOSE") {
          if (item.underNo === panna) {
            // ✅ CLOSE WIN
            item.resultStatus = "WIN";
            item.winAmount = item.gameRateWinAmount; // 👈 Direct set
            totalWinAmount += item.winAmount;
          } else {
            // ❌ CLOSE LOSS
            item.resultStatus = "LOSS";
            item.winAmount = 0;
          }
        }
      });

      /* 💰 WALLET UPDATE — SAME SESSION */
      if (totalWinAmount > 0) {
        bet.userId.wallet += totalWinAmount;
        await bet.userId.save();

        bet.afterWallet = bet.userId.wallet;
        bet.winningPanna = panna;
      }

      await bet.save();
    }

    /* =====================================================
   🔥 SINGLE PANNA BULK RESULT SETTLEMENT (OPEN / CLOSE INDEPENDENT)
===================================================== */

    const singlePannaBulkBets = await SinglePannaBulkBet.find({
      gameName,
      playedDate: formattedDate,
      "bets.resultStatus": "PENDING",
    }).populate("userId");

    for (const bet of singlePannaBulkBets) {
      let totalWinAmount = 0;

      bet.bets.forEach((item) => {
        if (item.resultStatus !== "PENDING") return;

        /* ================= 🟡 OPEN SESSION ================= */
        if (session === "OPEN" && item.mode === "OPEN") {
          if (item.underNo === panna) {
            // ✅ OPEN WIN
            item.resultStatus = "WIN";
            item.winAmount = item.gameRateWinAmount; // 👈 Direct set
            totalWinAmount += item.winAmount;
          } else {
            // ❌ OPEN LOSS
            item.resultStatus = "LOSS";
            item.winAmount = 0;
          }
        }

        /* ================= 🔴 CLOSE SESSION ================= */
        if (session === "CLOSE" && item.mode === "CLOSE") {
          if (item.underNo === panna) {
            // ✅ CLOSE WIN
            item.resultStatus = "WIN";
            item.winAmount = item.gameRateWinAmount; // 👈 Direct set
            totalWinAmount += item.winAmount;
          } else {
            // ❌ CLOSE LOSS
            item.resultStatus = "LOSS";
            item.winAmount = 0;
          }
        }
      });

      /* ================= 💰 WALLET UPDATE (SAME SESSION) ================= */
      if (totalWinAmount > 0) {
        bet.userId.wallet += totalWinAmount;
        await bet.userId.save();

        bet.afterWallet = bet.userId.wallet;
        bet.winningPanna = panna;
      }

      await bet.save();
    }

    /* =====================================================
   🔥 SINGLE BULK DIGIT RESULT SETTLEMENT (OPEN / CLOSE INDEPENDENT)
===================================================== */

    const singleBulkDigitBets = await SingleBulkDigitBet.find({
      gameName,
      playedDate: formattedDate,
      "bets.resultStatus": "PENDING",
    }).populate("userId");

    for (const bet of singleBulkDigitBets) {
      let totalWinAmount = 0;

      bet.bets.forEach((item) => {
        if (item.resultStatus !== "PENDING") return;

        /* 🟡 OPEN SESSION RESULT */
        if (session === "OPEN" && item.mode === "OPEN") {
          if (item.number === Number(digit)) {
            // ✅ OPEN WIN
            item.resultStatus = "WIN";
            item.winAmount = item.gameRateWinAmount; // 👈 Direct set
            totalWinAmount += item.winAmount;
          } else {
            // ❌ OPEN LOSS
            item.resultStatus = "LOSS";
            item.winAmount = 0;
          }
        }

        /* 🔴 CLOSE SESSION RESULT */
        if (session === "CLOSE" && item.mode === "CLOSE") {
          if (item.number === Number(digit)) {
            // ✅ CLOSE WIN
            item.resultStatus = "WIN";
            item.winAmount = item.gameRateWinAmount; // 👈 Direct set
            totalWinAmount += item.winAmount;
          } else {
            // ❌ CLOSE LOSS
            item.resultStatus = "LOSS";
            item.winAmount = 0;
          }
        }
      });

      /* 💰 WALLET UPDATE (OPEN ya CLOSE dono pe) */
      if (totalWinAmount > 0) {
        bet.userId.wallet += totalWinAmount;
        await bet.userId.save();

        bet.afterWallet = bet.userId.wallet;
        bet.winningNumber = Number(digit);
      }

      await bet.save();
    }

    /* =====================================================
   🔥 SINGLE DIGIT RESULT SETTLEMENT (OPEN / CLOSE INDEPENDENT)
===================================================== */

    const singleDigitBets = await SingleDigitBet.find({
      gameName,
      playedDate: formattedDate,
      "bets.resultStatus": "PENDING",
    }).populate("userId");

    for (const bet of singleDigitBets) {
      let totalWinAmount = 0;

      bet.bets.forEach((item) => {
        if (item.resultStatus !== "PENDING") return;

        /* 🟡 OPEN SESSION */
        if (session === "OPEN" && item.mode === "OPEN") {
          if (item.number === Number(digit)) {
            // ✅ OPEN WIN
            item.resultStatus = "WIN";
            item.winAmount = item.gameRateWinAmount; // 👈 Direct set
            totalWinAmount += item.winAmount;
          } else {
            // ❌ OPEN LOSS
            item.resultStatus = "LOSS";
            item.winAmount = 0;
          }
        }

        /* 🔴 CLOSE SESSION */
        if (session === "CLOSE" && item.mode === "CLOSE") {
          if (item.number === Number(digit)) {
            // ✅ CLOSE WIN
            item.resultStatus = "WIN";
            item.winAmount = item.gameRateWinAmount; // 👈 Direct set
            totalWinAmount += item.winAmount;
          } else {
            // ❌ CLOSE LOSS
            item.resultStatus = "LOSS";
            item.winAmount = 0;
          }
        }
      });

      /* 💰 WALLET UPDATE (OPEN ya CLOSE dono pe ho sakta hai) */
      if (totalWinAmount > 0) {
        bet.userId.wallet += totalWinAmount;
        await bet.userId.save();

        bet.afterWallet = bet.userId.wallet;
        bet.winningNumber = Number(digit);
      }

      await bet.save();
    }

    /* =====================================================
   🔥 TRIPLE PANNA RESULT SETTLEMENT (OPEN / CLOSE)
===================================================== */

    const triplePannaBets = await TriplePannaBet.find({
      gameName,
      playedDate: formattedDate,
      "bets.resultStatus": "PENDING",
    }).populate("userId");

    for (const bet of triplePannaBets) {
      let totalWinAmount = 0;

      bet.bets.forEach((item) => {
        if (item.resultStatus !== "PENDING") return;

        /* ================= 🟡 OPEN SESSION ================= */
        if (session === "OPEN" && item.mode === "OPEN") {
          if (item.number === panna) {
            // ✅ OPEN WIN
            item.resultStatus = "WIN";
            item.winAmount = item.gameRateWinAmount; // 👈 Direct set
            totalWinAmount += item.winAmount;
          } else {
            // ❌ OPEN LOSS
            item.resultStatus = "LOSS";
            item.winAmount = 0;
          }
        }

        /* ================= 🔴 CLOSE SESSION ================= */
        if (session === "CLOSE" && item.mode === "CLOSE") {
          if (item.number === panna) {
            // ✅ CLOSE WIN
            item.resultStatus = "WIN";
            item.winAmount = item.gameRateWinAmount; // 👈 Direct set
            totalWinAmount += item.winAmount;
          } else {
            // ❌ CLOSE LOSS
            item.resultStatus = "LOSS";
            item.winAmount = 0;
          }
        }
      });

      /* ================= 💰 WALLET UPDATE (SAME SESSION) ================= */
      if (totalWinAmount > 0) {
        bet.userId.wallet += totalWinAmount;
        await bet.userId.save();

        bet.afterWallet = bet.userId.wallet;
        bet.winningNumber = panna;
      }

      await bet.save();
    }

    /* =====================================================
       🔥 JODI DIGIT RESULT SETTLEMENT (TODAY ONLY)
    ===================================================== */

    const jodiDigitBets = await JodiDigitBet.find({
      gameName,
      playedDate: formattedDate,
      "bets.resultStatus": "PENDING",
    }).populate("userId");

    for (const bet of jodiDigitBets) {
      let totalWinAmount = 0;

      bet.bets.forEach((item) => {
        if (item.resultStatus !== "PENDING") return;

        const firstDigit = item.underNo[0]; // "1"
        const secondDigit = item.underNo[1]; // "0"

        /* 🟡 OPEN SESSION */
        if (session === "OPEN") {
          if (String(digit) === firstDigit) {
            item.openMatched = true; // 🔥 remember OPEN match
          }
          return; // ❗ no win / loss on OPEN
        }

        /* 🔴 CLOSE SESSION (FINAL) */
        if (session === "CLOSE") {
          const closeMatched = String(digit) === secondDigit;

          if (item.openMatched && closeMatched) {
            item.resultStatus = "WIN";
            item.winAmount = item.gameRateWinAmount; // 👈 Direct set
            totalWinAmount += item.winAmount;
          } else {
            item.resultStatus = "LOSS";
          }
        }
      });

      /* 💰 WALLET UPDATE — ONLY ON CLOSE */
      if (session === "CLOSE" && totalWinAmount > 0) {
        bet.userId.wallet += totalWinAmount;
        await bet.userId.save();

        bet.afterWallet = bet.userId.wallet;
        bet.winningJodi = digit; // optional, ya `${openDigit}${closeDigit}`
      }

      await bet.save();
    }

    /* =====================================================
   🔥 DOUBLE PANNA BULK RESULT SETTLEMENT (OPEN / CLOSE)
===================================================== */

    const doublePannaBulkBets = await DoublePannaBulkBet.find({
      gameName,
      playedDate: formattedDate,
      "bets.resultStatus": "PENDING",
    }).populate("userId");

    for (const bet of doublePannaBulkBets) {
      let totalWinAmount = 0;

      bet.bets.forEach((item) => {
        if (item.resultStatus !== "PENDING") return;

        /* ================= 🟡 OPEN SESSION ================= */
        if (session === "OPEN" && item.mode === "OPEN") {
          if (item.underNo === panna) {
            // ✅ OPEN WIN
            item.resultStatus = "WIN";
            item.winAmount = item.gameRateWinAmount; // 👈 Direct set
            totalWinAmount += item.winAmount;
          } else {
            // ❌ OPEN LOSS
            item.resultStatus = "LOSS";
            item.winAmount = 0;
          }
        }

        /* ================= 🔴 CLOSE SESSION ================= */
        if (session === "CLOSE" && item.mode === "CLOSE") {
          if (item.underNo === panna) {
            // ✅ CLOSE WIN
            item.resultStatus = "WIN";
            item.winAmount = item.gameRateWinAmount; // 👈 Direct set
            totalWinAmount += item.winAmount;
          } else {
            // ❌ CLOSE LOSS
            item.resultStatus = "LOSS";
            item.winAmount = 0;
          }
        }
      });

      /* ================= 💰 WALLET UPDATE (SAME SESSION) ================= */
      if (totalWinAmount > 0) {
        bet.userId.wallet += totalWinAmount;
        await bet.userId.save();

        bet.afterWallet = bet.userId.wallet;
        bet.winningPanna = panna;
      }

      await bet.save();
    }

    /* =====================================================
   🔥 JODI DIGIT BULK RESULT SETTLEMENT (TODAY ONLY)
===================================================== */

    const jodiDigitBulkBets = await JodiDigitBulkBet.find({
      gameName,
      playedDate: formattedDate,
      "bets.resultStatus": "PENDING",
    }).populate("userId");

    for (const bet of jodiDigitBulkBets) {
      let totalWinAmount = 0;

      bet.bets.forEach((item) => {
        if (item.resultStatus !== "PENDING") return;

        const firstDigit = item.underNo[0]; // OPEN digit
        const secondDigit = item.underNo[1]; // CLOSE digit

        /* 🟡 OPEN SESSION */
        if (session === "OPEN") {
          if (Number(firstDigit) === Number(digit)) {
            item.openMatched = true; // ✅ OPEN matched
          }
          return; // ❗ no WIN / LOSS on OPEN
        }

        /* 🔴 CLOSE SESSION (FINAL DECISION) */
        if (session === "CLOSE") {
          const closeMatched = Number(secondDigit) === Number(digit);

          if (item.openMatched && closeMatched) {
            // ✅ BOTH MATCH → WIN
            item.resultStatus = "WIN";
            item.winAmount = item.gameRateWinAmount; // 👈 Direct set
            totalWinAmount += item.winAmount;
          } else {
            // ❌ ANY FAIL → LOSS
            item.resultStatus = "LOSS";
          }
        }
      });

      /* 💰 WALLET UPDATE — ONLY ON CLOSE */
      if (session === "CLOSE" && totalWinAmount > 0) {
        bet.userId.wallet += totalWinAmount;
        await bet.userId.save();
        bet.afterWallet = bet.userId.wallet;
      }

      await bet.save();
    }

    /* =====================================================
   🔥 ODD EVEN RESULT SETTLEMENT (OPEN / CLOSE)
===================================================== */

    const oddEvenBets = await OddEvenBet.find({
      gameName,
      playedDate: formattedDate,
      "bets.resultStatus": "PENDING",
    }).populate("userId");

    for (const bet of oddEvenBets) {
      let totalWinAmount = 0;

      bet.bets.forEach((item) => {
        if (item.resultStatus !== "PENDING") return;

        const digitNum = Number(digit);
        const isOdd = digitNum % 2 === 1;
        const isEven = digitNum % 2 === 0;

        const patternMatched =
          (item.pattern === "ODD" && isOdd) ||
          (item.pattern === "EVEN" && isEven);

        /* ================= 🟡 OPEN SESSION ================= */
        if (session === "OPEN" && item.mode === "OPEN") {
          if (item.underNo === String(digit) && patternMatched) {
            // ✅ OPEN WIN
            item.resultStatus = "WIN";
            item.winAmount = item.gameRateWinAmount; // 👈 Direct set
            totalWinAmount += item.winAmount;
          } else {
            // ❌ OPEN LOSS
            item.resultStatus = "LOSS";
            item.winAmount = 0;
          }
        }

        /* ================= 🔴 CLOSE SESSION ================= */
        if (session === "CLOSE" && item.mode === "CLOSE") {
          if (item.underNo === String(digit) && patternMatched) {
            // ✅ CLOSE WIN
            item.resultStatus = "WIN";
            item.winAmount = item.gameRateWinAmount; // 👈 Direct set
            totalWinAmount += item.winAmount;
          } else {
            // ❌ CLOSE LOSS
            item.resultStatus = "LOSS";
            item.winAmount = 0;
          }
        }
      });

      /* ================= 💰 WALLET UPDATE (SAME SESSION) ================= */
      if (totalWinAmount > 0) {
        bet.userId.wallet += totalWinAmount;
        await bet.userId.save();

        bet.afterWallet = bet.userId.wallet;
      }

      await bet.save();
    }

    /* =====================================================
   🔥 RED BRACKET RESULT SETTLEMENT (OPEN + CLOSE BOTH)
===================================================== */

    const redBracketBets = await RedBracketBet.find({
      gameName,
      playedDate: formattedDate,
      "bets.resultStatus": "PENDING",
    }).populate("userId");

    for (const bet of redBracketBets) {
      let totalWinAmount = 0;
      let isAnyWin = false;

      bet.bets.forEach((item) => {
        if (item.resultStatus !== "PENDING") return;

        /* ================= OPEN SESSION ================= */
        if (session === "OPEN") {
          const openDigit = Number(digit);
          const firstDigit = Number(item.underNo[0]);

          if (openDigit === firstDigit) {
            item.openMatched = true; // ✅ sirf yaad rakhna
          }

          // OPEN me resultStatus nahi badlega
          return;
        }

        /* ================= CLOSE SESSION ================= */
        if (session === "CLOSE") {
          const closeDigit = Number(digit);
          const secondDigit = Number(item.underNo[1]);

          const closeMatched = closeDigit === secondDigit;

          if (item.openMatched && closeMatched) {
            // ✅ OPEN + CLOSE BOTH MATCH
            item.resultStatus = "WIN";
            item.winAmount = item.gameRateWinAmount; // 👈 Direct set

            totalWinAmount += item.winAmount;
            isAnyWin = true;
          } else {
            // ❌ koi ek bhi miss hua
            item.resultStatus = "LOSS";
          }
        }
      });

      /* ================= WALLET UPDATE (ONLY ON CLOSE) ================= */
      if (session === "CLOSE" && isAnyWin && totalWinAmount > 0) {
        bet.userId.wallet += totalWinAmount;
        await bet.userId.save();

        bet.afterWallet = bet.userId.wallet;
      }

      await bet.save();
    }

    /* =====================================================
   🔥 SP MOTOR RESULT SETTLEMENT (OPEN / CLOSE DIRECT)
===================================================== */

    const spMotorBets = await SPMotorBet.find({
      gameName,
      playedDate: formattedDate,
      "bets.resultStatus": "PENDING",
    }).populate("userId");

    for (const bet of spMotorBets) {
      let totalWinAmount = 0;

      bet.bets.forEach((item) => {
        if (item.resultStatus !== "PENDING") return;

        /* ================= 🟡 OPEN SESSION ================= */
        if (session === "OPEN" && item.session === "OPEN") {
          if (item.underNo === panna) {
            // ✅ OPEN WIN
            item.resultStatus = "WIN";
            item.winAmount = item.gameRateWinAmount; // 👈 Direct set
            totalWinAmount += item.winAmount;
          } else {
            // ❌ OPEN LOSS
            item.resultStatus = "LOSS";
            item.winAmount = 0;
          }
        }

        /* ================= 🔴 CLOSE SESSION ================= */
        if (session === "CLOSE" && item.session === "CLOSE") {
          if (item.underNo === panna) {
            // ✅ CLOSE WIN
            item.resultStatus = "WIN";
            item.winAmount = item.gameRateWinAmount; // 👈 Direct set
            totalWinAmount += item.winAmount;
          } else {
            // ❌ CLOSE LOSS
            item.resultStatus = "LOSS";
            item.winAmount = 0;
          }
        }
      });

      /* ================= 💰 WALLET UPDATE (SAME SESSION) ================= */
      if (totalWinAmount > 0) {
        bet.userId.wallet += totalWinAmount;
        await bet.userId.save();

        bet.afterWallet = bet.userId.wallet;
      }

      await bet.save();
    }

    /* =====================================================
   🔥 DP MOTOR RESULT SETTLEMENT (OPEN / CLOSE DIRECT)
===================================================== */
    const dpMotorBets = await DPMotorBet.find({
      gameName,
      playedDate: formattedDate,
      "bets.resultStatus": "PENDING",
    }).populate("userId");

    for (const bet of dpMotorBets) {
      let totalWinAmount = 0;

      bet.bets.forEach((item) => {
        if (item.resultStatus !== "PENDING") return;

        /* ================= 🟡 OPEN SESSION ================= */
        if (session === "OPEN" && item.session === "OPEN") {
          if (item.underNo === panna) {
            // ✅ OPEN WIN
            item.resultStatus = "WIN";
            item.winAmount = item.gameRateWinAmount; // 👈 Direct set
            totalWinAmount += item.winAmount;
          } else {
            // ❌ OPEN LOSS
            item.resultStatus = "LOSS";
            item.winAmount = 0;
          }
        }

        /* ================= 🔴 CLOSE SESSION ================= */
        if (session === "CLOSE" && item.session === "CLOSE") {
          if (item.underNo === panna) {
            // ✅ CLOSE WIN
            item.resultStatus = "WIN";
            item.winAmount = item.gameRateWinAmount; // 👈 Direct set
            totalWinAmount += item.winAmount;
          } else {
            // ❌ CLOSE LOSS
            item.resultStatus = "LOSS";
            item.winAmount = 0;
          }
        }
      });

      /* ================= 💰 WALLET UPDATE (SAME SESSION) ================= */
      if (totalWinAmount > 0) {
        bet.userId.wallet += totalWinAmount;
        await bet.userId.save();

        bet.afterWallet = bet.userId.wallet;
      }

      await bet.save();
    }

    /* =====================================================
   🔥 SP DP TP RESULT SETTLEMENT (OPEN / CLOSE DIRECT)
===================================================== */

    const spdptpBets = await spdptpBet
      .find({
        gameName,
        playedDate: formattedDate,
        "bets.resultStatus": "PENDING",
      })
      .populate("userId");

    for (const bet of spdptpBets) {
      let totalWinAmount = 0;

      bet.bets.forEach((item) => {
        if (item.resultStatus !== "PENDING") return;

        /* ================= 🟡 OPEN SESSION ================= */
        if (session === "OPEN" && item.session === "Open") {
          if (item.underNo === panna) {
            // ✅ OPEN WIN
            item.resultStatus = "WIN";
            item.winAmount = item.gameRateWinAmount; // 👈 Direct set
            totalWinAmount += item.winAmount;
          } else {
            // ❌ OPEN LOSS
            item.resultStatus = "LOSS";
            item.winAmount = 0;
          }
        }

        /* ================= 🔴 CLOSE SESSION ================= */
        if (session === "CLOSE" && item.session === "Close") {
          if (item.underNo === panna) {
            // ✅ CLOSE WIN
            item.resultStatus = "WIN";
            item.winAmount = item.gameRateWinAmount; // 👈 Direct set
            totalWinAmount += item.winAmount;
          } else {
            // ❌ CLOSE LOSS
            item.resultStatus = "LOSS";
            item.winAmount = 0;
          }
        }
      });

      /* ================= 💰 WALLET UPDATE (SAME SESSION) ================= */
      if (totalWinAmount > 0) {
        bet.userId.wallet += totalWinAmount;
        await bet.userId.save();

        bet.afterWallet = bet.userId.wallet;
      }

      await bet.save();
    }

    /* =====================================================
   🔥 FULL SANGAM RESULT SETTLEMENT (CORRECT LOGIC)
===================================================== */

    const fullSangamBets = await FullSangamBet.find({
      gameName,
      playedDate: formattedDate,
      "bets.resultStatus": "PENDING",
    }).populate("userId");

    for (const bet of fullSangamBets) {
      let totalWinAmount = 0;

      bet.bets.forEach((item) => {
        if (item.resultStatus !== "PENDING") return;

        /* 🟡 OPEN RESULT */
        if (session === "OPEN") {
          if (item.openPanna === panna) {
            item.openMatched = true;
          }
          return;
        }

        /* 🔴 CLOSE RESULT (FINAL) */
        if (session === "CLOSE") {
          if (item.openMatched === true && item.closePanna === panna) {
            item.resultStatus = "WIN";
            item.winAmount = item.gameRateWinAmount; // 👈 Direct set
            totalWinAmount += item.winAmount;
          } else {
            item.resultStatus = "LOSS";
            item.winAmount = 0; // ✅ ADD THIS
          }
        }
      });

      /* 💰 WALLET UPDATE */
      if (session === "CLOSE" && totalWinAmount > 0) {
        bet.userId.wallet += totalWinAmount;
        await bet.userId.save();
        bet.afterWallet = bet.userId.wallet;
      }

      await bet.save();
    }

    /* =====================================================
   🔥 HALF SANGAM RESULT SETTLEMENT (OPEN / CLOSE SAFE)
===================================================== */

    const halfSangamBets = await HalfSangamBet.find({
      gameName,
      playedDate: formattedDate,
      "bets.resultStatus": "PENDING",
    }).populate("userId");

    for (const bet of halfSangamBets) {
      let totalWinAmount = 0;

      bet.bets.forEach((item) => {
        if (item.resultStatus !== "PENDING") return;

        /* 🟡 OPEN RESULT */
        if (session === "OPEN") {
          if (item.openPanna === panna) {
            item.openMatched = true;
          }
          return;
        }

        /* 🔴 CLOSE RESULT (FINAL) */
        if (session === "CLOSE") {
          if (item.openMatched === true && item.closeDigit === Number(digit)) {
            item.resultStatus = "WIN";

            // ✅ ADD THIS
            item.winAmount = item.gameRateWinAmount; // 👈 Direct set

            totalWinAmount += item.winAmount;
          } else {
            item.resultStatus = "LOSS";
            item.winAmount = 0; // ✅ safety
          }
        }
      });

      /* 💰 WALLET UPDATE */
      if (session === "CLOSE" && totalWinAmount > 0) {
        bet.userId.wallet += totalWinAmount;
        await bet.userId.save();
        bet.afterWallet = bet.userId.wallet;
      }

      await bet.save();
    }

    /* ================= RESPONSE ================= */
    return res.json({
      success: true,
      message: "Result declared & Double Panna bets settled successfully",
    });
  } catch (err) {
    console.error("Declare result error:", err);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

//Jackpot result declaration
exports.jackpotGameResult = async (req, res) => {
  try {
    if (
      !req.session.isLoggedIn ||
      !req.session.admin ||
      req.session.admin.role !== "admin"
    ) {
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

    // ✅ TODAY DATE IN IST (exact same format as declared result)
    const todayDate = DateTime.now()
      .setZone("Asia/Kolkata")
      .toFormat("yyyy-MM-dd");

    // fetch today's results
    const results = await JackpotGameResult.find({
      resultDate: todayDate,
    }).sort({ createdAt: 1 });

    // 🔥 GROUP BY gameName WITH RESULTS
    const groupedResults = {};
    results.forEach((r) => {
      if (!groupedResults[r.gameName]) {
        groupedResults[r.gameName] = {
          gameName: r.gameName,
          resultDate: r.resultDate,
          results: [],
        };
      }

      groupedResults[r.gameName].results.push({
        left: r.left,
        right: r.right,
        jodi: r.jodi,
        resultTime: r.resultTime,
      });
    });

    res.render("Admin/jackpotGameResult", {
      pageTitle: "Admin Jackpot Game Result",
      admin,
      isLoggedIn: req.session.isLoggedIn,
      todayResults: Object.values(groupedResults),
    });
  } catch (err) {
    console.error("Admin Jackpot Game Result Error:", err);
    res.redirect("/admin/login");
  }
};

exports.getJackpotPendingGames = async (req, res) => {
  try {
    // --------- ADMIN AUTH ----------
    if (
      !req.session.isLoggedIn ||
      !req.session.admin ||
      req.session.admin.role !== "admin"
    ) {
      return res.redirect("/admin/login");
    }

    // --------- SELECTED DATE ----------
    const dateParam = req.query.date; // ?date=YYYY-MM-DD
    const date = dateParam
      ? DateTime.fromISO(dateParam, { zone: "Asia/Kolkata" })
      : DateTime.now().setZone("Asia/Kolkata");

    const selectedDate = date.toFormat("yyyy-MM-dd");
    const selectedDay = date.toFormat("cccc").toLowerCase(); // monday

    // --------- ACTIVE JACKPOT GAMES ----------
    const jackpotGames = await Game.find({
      isDeleted: false,
      isJackpot: true,
      [`schedule.${selectedDay}.isActive`]: true,
    }).select("gameName");

    const jackpotGameNames = jackpotGames.map((g) => g.gameName);

    // --------- DECLARED JACKPOT RESULTS ----------
    const declaredResults = await JackpotGameResult.find({
      resultDate: selectedDate,
    }).select("gameName");

    const declaredGameSet = new Set(declaredResults.map((r) => r.gameName));

    // --------- PENDING JACKPOT GAMES ----------
    const pendingGames = jackpotGameNames.filter(
      (gameName) => !declaredGameSet.has(gameName),
    );

    return res.json({
      success: true,
      date: selectedDate,
      games: pendingGames,
    });
  } catch (err) {
    console.error("Jackpot pending game fetch error:", err);
    return res.status(500).json({ success: false });
  }
};

exports.declareJackpotGameResult = async (req, res) => {
  try {
    /* ================= ADMIN AUTH ================= */
    if (
      !req.session.isLoggedIn ||
      !req.session.admin ||
      req.session.admin.role !== "admin"
    ) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const admin = await User.findById(req.session.admin._id);
    if (!admin) {
      req.session.destroy();
      return res
        .status(401)
        .json({ success: false, message: "Session expired" });
    }

    /* ================= REQUEST DATA ================= */
    const { gameName, left, right, resultDate } = req.body;

    if (!gameName || !resultDate) {
      return res.status(400).json({
        success: false,
        message: "Game name & result date are required",
      });
    }

    const hasLeft = left !== undefined && left !== null && left !== "";
    const hasRight = right !== undefined && right !== null && right !== "";

    if (!hasLeft && !hasRight) {
      return res.status(400).json({
        success: false,
        message: "At least LEFT or RIGHT digit must be provided",
      });
    }

    const jodi = hasLeft && hasRight ? `${left}${right}` : null;

    /* ================= IST DATE ================= */
    const ist = DateTime.fromISO(resultDate, { zone: "Asia/Kolkata" });
    const formattedDate = ist.toFormat("yyyy-MM-dd");
    const formattedTime = ist.toFormat("HH:mm");
    const weekday = ist.toFormat("cccc");

    /* ================= DUPLICATE RESULT CHECK ================= */
    const existingResult = await JackpotGameResult.findOne({
      gameName,
      resultDate: formattedDate,
    });

    if (existingResult) {
      return res.status(400).json({
        success: false,
        message: "Result already declared for this game and date",
      });
    }

    /* ================= SAVE RESULT ================= */
    await JackpotGameResult.create({
      gameName,
      left: hasLeft ? left : null,
      right: hasRight ? right : null,
      jodi,
      resultDate: formattedDate,
      resultTime: formattedTime,
      resultWeekday: weekday,
    });

    /* ======================================================
       🎯 LEFT DIGIT SETTLEMENT
    ====================================================== */
    if (hasLeft) {
      const leftDigitBets = await LeftDigitBet.find({
        gameName,
        playedDate: formattedDate,
      });

      for (const bet of leftDigitBets) {
        let winAmount = 0;

        bet.bets.forEach((item) => {
          if (item.openDigit === String(left)) {
            item.resultStatus = "WIN";
            item.winAmount = item.gameRateWinAmount; // 👈 Direct set
            winAmount += item.winAmount;
          } else {
            item.resultStatus = "LOSS";
            item.winAmount = 0;
          }
        });

        if (winAmount > 0) {
          await User.findByIdAndUpdate(bet.userId, {
            $inc: { wallet: winAmount },
          });
        }

        await bet.save();
      }
    }

    /* ======================================================
   🎯 RIGHT DIGIT SETTLEMENT
====================================================== */
    if (hasRight) {
      const rightDigitBets = await RightDigitBet.find({
        gameName,
        playedDate: formattedDate,
      });

      for (const bet of rightDigitBets) {
        let winAmount = 0;

        bet.bets.forEach((item) => {
          if (item.openDigit === String(right)) {
            item.resultStatus = "WIN";
            item.winAmount = item.gameRateWinAmount; // 👈 Direct set
            winAmount += item.winAmount;
          } else {
            item.resultStatus = "LOSS";
            item.winAmount = 0; // ✅ Reset for safety
          }
        });

        if (winAmount > 0) {
          await User.findByIdAndUpdate(bet.userId, {
            $inc: { wallet: winAmount },
          });
        }

        await bet.save();
      }
    }

    /* ======================================================
   🎯 CENTER JODI SETTLEMENT
====================================================== */
    if (hasLeft && hasRight) {
      const centerJodiBets = await CenterJodiDigitBet.find({
        gameName,
        playedDate: formattedDate,
      });

      for (const bet of centerJodiBets) {
        let winAmount = 0;

        bet.bets.forEach((item) => {
          if (item.openDigit === jodi) {
            item.resultStatus = "WIN";
            item.winAmount = item.gameRateWinAmount; // 👈 Direct set
            winAmount += item.winAmount;
          } else {
            item.resultStatus = "LOSS";
            item.winAmount = 0; // ✅ Reset for safety
          }
        });

        if (winAmount > 0) {
          await User.findByIdAndUpdate(bet.userId, {
            $inc: { wallet: winAmount },
          });
        }

        await bet.save();
      }
    }

    /* ================= RESPONSE ================= */
    return res.json({
      success: true,
      message: "Jackpot result declared & bets settled safely",
    });
  } catch (err) {
    console.error("Declare jackpot result error:", err);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Starline game result declaration and display

exports.starlineGameResult = async (req, res) => {
  try {
    if (
      !req.session.isLoggedIn ||
      !req.session.admin ||
      req.session.admin.role !== "admin"
    ) {
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

    // ✅ TODAY DATE IN IST (Exact same format as declare function)
    const todayDate = DateTime.now()
      .setZone("Asia/Kolkata")
      .toFormat("yyyy-MM-dd");

    // ✅ Fetch only OPEN session results
    const results = await starlineGameDeclareResult
      .find({ resultDate: todayDate, session: "OPEN" })
      .sort({ createdAt: 1 });

    // Group by gameName
    const groupedResults = {};
    results.forEach((r) => {
      if (!groupedResults[r.gameName]) {
        groupedResults[r.gameName] = {
          gameName: r.gameName,
          resultDate: r.resultDate,
          open: null,
        };
      }
      groupedResults[r.gameName].open = r;
    });

    res.render("Admin/starlineGameResult", {
      pageTitle: "Admin Starline Game Result",
      admin,
      isLoggedIn: req.session.isLoggedIn,
      todayResults: Object.values(groupedResults),
    });
  } catch (err) {
    console.error("Admin Starline Game Result Error:", err);
    res.redirect("/admin/login");
  }
};

exports.getStarlinePendingGames = async (req, res) => {
  try {
    // --------- ADMIN AUTH ----------
    if (
      !req.session.isLoggedIn ||
      !req.session.admin ||
      req.session.admin.role !== "admin"
    ) {
      return res.redirect("/admin/login");
    }

    // --------- SELECTED DATE ----------
    const dateParam = req.query.date; // from frontend ?date=YYYY-MM-DD
    const date = dateParam
      ? DateTime.fromISO(dateParam, { zone: "Asia/Kolkata" })
      : DateTime.now().setZone("Asia/Kolkata");

    const selectedDate = date.toFormat("yyyy-MM-dd");
    const selectedDay = date.toFormat("cccc").toLowerCase(); // monday

    // --------- ACTIVE GAMES ON THAT DAY ----------
    const games = await Game.find({
      isDeleted: false,
      isStarline: true, // only starline games
      [`schedule.${selectedDay}.isActive`]: true,
    }).select("gameName");

    const allGameNames = games.map((g) => g.gameName);

    // --------- ALREADY DECLARED RESULTS ON THAT DATE ----------
    const declaredResults = await starlineGameDeclareResult
      .find({
        resultDate: selectedDate,
      })
      .select("gameName session");

    const resultMap = {};
    declaredResults.forEach((r) => {
      if (!resultMap[r.gameName]) resultMap[r.gameName] = new Set();
      resultMap[r.gameName].add(r.session);
    });

    // --------- FILTER PENDING GAMES ----------
    const pendingGames = allGameNames.filter((gameName) => {
      const sessionsDone = resultMap[gameName];
      // no result at all
      if (!sessionsDone) return true;
      // missing OPEN or CLOSE
      return !(sessionsDone.has("OPEN") && sessionsDone.has("CLOSE"));
    });

    return res.json({ success: true, games: pendingGames });
  } catch (err) {
    console.error("Pending game fetch error:", err);
    return res.status(500).json({ success: false });
  }
};

exports.declareStarlineGameResult = async (req, res) => {
  try {
    /* ================= ADMIN AUTH ================= */
    if (
      !req.session.isLoggedIn ||
      !req.session.admin ||
      req.session.admin.role !== "admin"
    ) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const admin = await User.findOne({
      _id: req.session.admin._id,
      role: "admin",
      userStatus: "active",
    });

    if (!admin) {
      req.session.destroy();
      return res
        .status(401)
        .json({ success: false, message: "Session expired" });
    }

    /* ================= REQUEST DATA ================= */
    const { gameName, session, panna, digit, resultDate } = req.body;

    if (!gameName || !session || !panna || !digit || !resultDate) {
      return res
        .status(400)
        .json({ success: false, message: "Missing required fields" });
    }

    // --------- PARSE DATE IN IST ----------
    const ist = DateTime.fromISO(resultDate, { zone: "Asia/Kolkata" });
    const formattedDate = ist.toFormat("yyyy-MM-dd");
    const formattedTime = ist.toFormat("HH:mm");
    const weekday = ist.toFormat("cccc");

    // --------- CREATE IST-SAFE Date object for createdAt ----------
    const createdAtIST = new Date(
      ist.year,
      ist.month - 1, // JS months are 0-indexed
      ist.day,
      ist.hour,
      ist.minute,
      ist.second,
      ist.millisecond,
    );

    /* ================= DUPLICATE RESULT CHECK ================= */
    const existingResult = await starlineGameDeclareResult.findOne({
      gameName,
      session,
      resultDate: formattedDate,
    });

    if (existingResult) {
      return res.status(400).json({
        success: false,
        message: "Result already declared for this game/session/date",
      });
    }

    // --------- SAVE RESULT ----------
    await starlineGameDeclareResult.create({
      gameName,
      session,
      panna,
      digit,
      resultDate: formattedDate,
      resultTime: formattedTime,
      resultWeekday: weekday,
      createdAt: createdAtIST,
    });

    /* =====================================================
   🔥 SINGLE DIGIT RESULT SETTLEMENT (OPEN / CLOSE INDEPENDENT)
===================================================== */

    const singleDigitBets = await StarlineSingleDigitBet.find({
      gameName,
      playedDate: formattedDate,
      "bets.resultStatus": "PENDING",
    }).populate("userId");

    for (const bet of singleDigitBets) {
      let totalWinAmount = 0;

      bet.bets.forEach((item) => {
        if (item.resultStatus !== "PENDING") return;

        /* 🟡 OPEN SESSION */
        if (session === "OPEN" && item.mode === "OPEN") {
          if (item.number === Number(digit)) {
            // ✅ OPEN WIN
            item.resultStatus = "WIN";
            item.winAmount = item.gameRateWinAmount; // 👈 Direct set
            totalWinAmount += item.winAmount;
          } else {
            // ❌ OPEN LOSS
            item.resultStatus = "LOSS";
            item.winAmount = 0;
          }
        }

        /* 🔴 CLOSE SESSION */
        if (session === "CLOSE" && item.mode === "CLOSE") {
          if (item.number === Number(digit)) {
            // ✅ CLOSE WIN
            item.resultStatus = "WIN";
            item.winAmount = item.gameRateWinAmount; // 👈 Direct set
            totalWinAmount += item.winAmount;
          } else {
            // ❌ CLOSE LOSS
            item.resultStatus = "LOSS";
            item.winAmount = 0;
          }
        }
      });

      /* 💰 WALLET UPDATE (OPEN ya CLOSE dono pe ho sakta hai) */
      if (totalWinAmount > 0) {
        bet.userId.wallet += totalWinAmount;
        await bet.userId.save();

        bet.afterWallet = bet.userId.wallet;
        bet.winningNumber = Number(digit);
      }

      await bet.save();
    }

    /* =====================================================
   🔥 SINGLE PANNA RESULT SETTLEMENT (OPEN / CLOSE INDEPENDENT)
===================================================== */

    const singlePannaBets = await StarlineSinglePannaBet.find({
      gameName,
      playedDate: formattedDate,
      "bets.resultStatus": "PENDING",
    }).populate("userId");

    for (const bet of singlePannaBets) {
      let totalWinAmount = 0;

      bet.bets.forEach((item) => {
        if (item.resultStatus !== "PENDING") return;

        /* 🟡 OPEN SESSION RESULT */
        if (session === "OPEN" && item.mode === "OPEN") {
          if (item.underNo === panna) {
            // ✅ OPEN WIN
            item.resultStatus = "WIN";
            item.winAmount = item.gameRateWinAmount; // 👈 Direct set
            totalWinAmount += item.winAmount;
          } else {
            // ❌ OPEN LOSS
            item.resultStatus = "LOSS";
            item.winAmount = 0;
          }
        }

        /* 🔴 CLOSE SESSION RESULT */
        if (session === "CLOSE" && item.mode === "CLOSE") {
          if (item.underNo === panna) {
            // ✅ CLOSE WIN
            item.resultStatus = "WIN";
            item.winAmount = item.gameRateWinAmount; // 👈 Direct set
            totalWinAmount += item.winAmount;
          } else {
            // ❌ CLOSE LOSS
            item.resultStatus = "LOSS";
            item.winAmount = 0;
          }
        }
      });

      /* 💰 WALLET UPDATE — SAME SESSION */
      if (totalWinAmount > 0) {
        bet.userId.wallet += totalWinAmount;
        await bet.userId.save();

        bet.afterWallet = bet.userId.wallet;
        bet.winningPanna = panna;
      }

      await bet.save();
    }

    /* =====================================================
   🔥 DOUBLE PANNA RESULT SETTLEMENT (OPEN / CLOSE INDEPENDENT)
===================================================== */
    const bets = await StarlineDoublePannaBet.find({
      gameName,
      playedDate: formattedDate,
      "bets.resultStatus": "PENDING",
    }).populate("userId");

    for (const bet of bets) {
      let totalWinAmount = 0;

      bet.bets.forEach((item) => {
        if (item.resultStatus !== "PENDING") return;

        /* ================= 🟡 OPEN SESSION ================= */
        if (session === "OPEN" && item.mode === "OPEN") {
          if (item.underNo === panna) {
            // ✅ OPEN WIN
            item.resultStatus = "WIN";
            item.winAmount = item.gameRateWinAmount; // 👈 Direct set
            totalWinAmount += item.winAmount;
          } else {
            // ❌ OPEN LOSS
            item.resultStatus = "LOSS";
            item.winAmount = 0;
          }
        }

        /* ================= 🔴 CLOSE SESSION ================= */
        if (session === "CLOSE" && item.mode === "CLOSE") {
          if (item.underNo === panna) {
            // ✅ CLOSE WIN
            item.resultStatus = "WIN";
            item.winAmount = item.gameRateWinAmount; // 👈 Direct set
            totalWinAmount += item.winAmount;
          } else {
            // ❌ CLOSE LOSS
            item.resultStatus = "LOSS";
            item.winAmount = 0;
          }
        }
      });

      /* ================= 💰 WALLET UPDATE (SAME SESSION) ================= */
      if (totalWinAmount > 0) {
        bet.userId.wallet += totalWinAmount;
        await bet.userId.save();

        bet.afterWallet = bet.userId.wallet;
        bet.winningPanna = panna;
      }

      await bet.save();
    }

    /* =====================================================
   🔥 TRIPLE PANNA RESULT SETTLEMENT (OPEN / CLOSE)
===================================================== */

    const triplePannaBets = await StarlineTriplePannaBet.find({
      gameName,
      playedDate: formattedDate,
      "bets.resultStatus": "PENDING",
    }).populate("userId");

    for (const bet of triplePannaBets) {
      let totalWinAmount = 0;

      bet.bets.forEach((item) => {
        if (item.resultStatus !== "PENDING") return;

        /* ================= 🟡 OPEN SESSION ================= */
        if (session === "OPEN" && item.mode === "OPEN") {
          if (item.number === panna) {
            // ✅ OPEN WIN
            item.resultStatus = "WIN";
            item.winAmount = item.gameRateWinAmount; // 👈 Direct set
            totalWinAmount += item.winAmount;
          } else {
            // ❌ OPEN LOSS
            item.resultStatus = "LOSS";
            item.winAmount = 0;
          }
        }

        /* ================= 🔴 CLOSE SESSION ================= */
        if (session === "CLOSE" && item.mode === "CLOSE") {
          if (item.number === panna) {
            // ✅ CLOSE WIN
            item.resultStatus = "WIN";
            item.winAmount = item.gameRateWinAmount; // 👈 Direct set
            totalWinAmount += item.winAmount;
          } else {
            // ❌ CLOSE LOSS
            item.resultStatus = "LOSS";
            item.winAmount = 0;
          }
        }
      });

      /* ================= 💰 WALLET UPDATE (SAME SESSION) ================= */
      if (totalWinAmount > 0) {
        bet.userId.wallet += totalWinAmount;
        await bet.userId.save();

        bet.afterWallet = bet.userId.wallet;
        bet.winningNumber = panna;
      }

      await bet.save();
    }

    /* ================= RESPONSE ================= */
    return res.json({
      success: true,
      message: "Result declared & Double Panna bets settled successfully",
    });
  } catch (err) {
    console.error("Declare result error:", err);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

exports.showPreviewWinnerList = async (req, res) => {
  try {
    // ================= AUTH CHECK =================
    if (
      !req.session.isLoggedIn ||
      !req.session.admin ||
      req.session.admin.role !== "admin"
    ) {
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

    const { gameName, session, panna, digit, resultDate } = req.body;

    if (!gameName || !session || !panna || !digit || !resultDate) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    const ist = DateTime.fromISO(resultDate, { zone: "Asia/Kolkata" });
    const formattedDate = ist.toFormat("yyyy-MM-dd");

    // =========================================================
    // 🔥 MASTER HELPER (MULTI BET SAFE)
    // =========================================================

    const findAndFilterBets = async (Model, elemMatch) => {
      const docs = await Model.find({
        gameName,
        playedDate: formattedDate,
        bets: { $elemMatch: elemMatch },
      })
        .populate("userId")
        .lean();

      return docs
        .map((doc) => ({
          _id: doc._id,
          gameName: doc.gameName,
          gameType: doc.gameType,
          userId: doc.userId,
          bets: doc.bets.filter((bet) =>
            Object.keys(elemMatch).every((key) => {
              const condition = elemMatch[key];

              if (condition?.$regex) {
                return new RegExp(condition.$regex).test(bet[key]);
              }

              return bet[key] === condition;
            }),
          ),
        }))
        .filter((doc) => doc.bets.length > 0);
    };

    // =========================================================
    // 1️⃣ SINGLE DIGIT
    // =========================================================

    const singleDigitMatch = {
      number: Number(digit),
      mode: session,
      resultStatus: "PENDING",
    };

    const oddEvenMatch = {
      underNo: digit,
      mode: session,
      resultStatus: "PENDING",
    };

    const [singleDigitData, singleBulkData, oddEvenData] = await Promise.all([
      findAndFilterBets(SingleDigitBet, singleDigitMatch),
      findAndFilterBets(SingleBulkDigitBet, singleDigitMatch),
      findAndFilterBets(OddEvenBet, oddEvenMatch),
    ]);

    // =========================================================
    // 2️⃣ PANNA TYPES
    // =========================================================

    const pannaMatch = {
      underNo: panna,
      mode: session,
      resultStatus: "PENDING",
    };

    const tripleMatch = {
      number: panna,
      mode: session,
      resultStatus: "PENDING",
    };

    const spdpMatch = {
      underNo: panna,
      session: session,
      resultStatus: "PENDING",
    };

    const spdptpMatch = {
      underNo: panna,
      session: session === "OPEN" ? "Open" : "Close",
      resultStatus: "PENDING",
    };

    const [
      singlePannaData,
      singlePannaBulkData,
      doublePannaData,
      doublePannaBulkData,
      triplePannaData,
      spMotorData,
      dpMotorData,
      spdptpData,
    ] = await Promise.all([
      findAndFilterBets(SinglePannaBet, pannaMatch),
      findAndFilterBets(SinglePannaBulkBet, pannaMatch),
      findAndFilterBets(DoublePannaBet, pannaMatch),
      findAndFilterBets(DoublePannaBulkBet, pannaMatch),
      findAndFilterBets(TriplePannaBet, tripleMatch),
      findAndFilterBets(SPMotorBet, spdpMatch),
      findAndFilterBets(DPMotorBet, spdpMatch),
      findAndFilterBets(spdptpBet, spdptpMatch),
    ]);

    // =========================================================
    // 3️⃣ CLOSE SPECIAL GAMES
    // =========================================================

    let jodiData = [];
    let jodiDigitBulkData = [];
    let redBracketData = [];
    let halfSangamData = [];
    let fullSangamData = [];

    if (session === "CLOSE") {
      const jodiMatch = {
        openMatched: true,
        resultStatus: "PENDING",
        underNo: { $regex: `${digit}$` },
      };

      const halfSangamMatch = {
        openMatched: true,
        closeDigit: Number(digit),
        resultStatus: "PENDING",
      };

      const fullSangamMatch = {
        openMatched: true,
        closePanna: panna,
        resultStatus: "PENDING",
      };

      [
        jodiData,
        jodiDigitBulkData,
        redBracketData,
        halfSangamData,
        fullSangamData,
      ] = await Promise.all([
        findAndFilterBets(JodiDigitBet, jodiMatch),
        findAndFilterBets(JodiDigitBulkBet, jodiMatch),
        findAndFilterBets(RedBracketBet, jodiMatch),
        findAndFilterBets(HalfSangamBet, halfSangamMatch),
        findAndFilterBets(FullSangamBet, fullSangamMatch),
      ]);
    }

    // =========================================================
    // 🔥 MERGE ALL DATA
    // =========================================================

    const finalData = [
      ...singleDigitData,
      ...singleBulkData,
      ...oddEvenData,
      ...singlePannaData,
      ...singlePannaBulkData,
      ...doublePannaData,
      ...doublePannaBulkData,
      ...triplePannaData,
      ...spMotorData,
      ...dpMotorData,
      ...spdptpData,
      ...jodiData,
      ...jodiDigitBulkData,
      ...redBracketData,
      ...halfSangamData,
      ...fullSangamData,
    ];

    return res.status(200).json({
      success: true,
      count: finalData.length,
      data: finalData,
    });
  } catch (error) {
    console.error("Preview Winner Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// change bid amount and bid number by admin (for all games - single digit, double panna, single panna, jodi digit etc)
exports.changeBidNumberAmount = async (req, res) => {
  try {
    /* ================= ADMIN AUTH ================= */
    if (
      !req.session.isLoggedIn ||
      !req.session.admin ||
      req.session.admin.role !== "admin"
    ) {
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

    /* ================= REQUEST DATA ================= */
    const { betId, underNo, amountPerUnderNo } = req.body;

    if (!betId) {
      return res.status(400).json({
        success: false,
        message: "Bet ID required",
      });
    }

    /* ================= ALL MODELS ================= */
    const betModels = [
      SingleDigitBet,
      SingleBulkDigitBet,
      JodiDigitBet,
      JodiDigitBulkBet,
      SinglePannaBet,
      SinglePannaBulkBet,
      DoublePannaBet,
      DoublePannaBulkBet,
      TriplePannaBet,
      OddEvenBet,
      HalfSangamBet,
      FullSangamBet,
      SPMotorBet,
      DPMotorBet,
      spdptpBet,
      RedBracketBet,
    ];

    let betDocument = null;

    /* ================= FIND BET ================= */
    for (const model of betModels) {
      let found = await model.findById(betId);
      if (found) {
        betDocument = found;
        break;
      }

      found = await model.findOne({ "bets._id": betId });
      if (found) {
        betDocument = found;
        break;
      }
    }

    if (!betDocument) {
      return res.status(404).json({
        success: false,
        message: "Bet not found",
      });
    }

    /* ================= UPDATE LOGIC ================= */

    /* ===== CASE 1 : ARRAY BET ===== */
    if (Array.isArray(betDocument.bets)) {
      const subBet = betDocument.bets.id(betId);

      if (!subBet) {
        return res.status(404).json({
          success: false,
          message: "Sub bet not found",
        });
      }

      /* ---- UPDATE NUMBER ---- */
      if (underNo !== undefined) {
        if (subBet.underNo !== undefined) subBet.underNo = underNo;
        if (subBet.number !== undefined) subBet.number = underNo;
        if (subBet.closeDigit !== undefined) subBet.closeDigit = underNo;

        if (
          subBet.openPanna !== undefined &&
          typeof underNo === "string" &&
          underNo.length === 3
        ) {
          subBet.openPanna = underNo;
        }

        if (
          subBet.closePanna !== undefined &&
          typeof underNo === "string" &&
          underNo.length === 3
        ) {
          subBet.closePanna = underNo;
        }
      }

      /* ---- UPDATE AMOUNT ---- */
      if (amountPerUnderNo !== undefined) {
        const amt = Number(amountPerUnderNo);

        if (subBet.amount !== undefined) subBet.amount = amt;
        if (subBet.amountPerUnderNo !== undefined)
          subBet.amountPerUnderNo = amt;
        if (subBet.totalAmount !== undefined) subBet.totalAmount = amt;
      }

      /* ---- RESET RESULT ---- */
      if (subBet.winAmount !== undefined) subBet.winAmount = 0;
      if (subBet.resultStatus !== undefined) subBet.resultStatus = "PENDING";
    } else {
      /* ===== CASE 2 : SINGLE OBJECT BET ===== */
      /* ---- UPDATE NUMBER ---- */
      if (underNo !== undefined) {
        if (betDocument.underNo !== undefined) betDocument.underNo = underNo;
        if (betDocument.number !== undefined) betDocument.number = underNo;
        if (betDocument.closeDigit !== undefined)
          betDocument.closeDigit = underNo;

        if (
          betDocument.openPanna !== undefined &&
          typeof underNo === "string" &&
          underNo.length === 3
        ) {
          betDocument.openPanna = underNo;
        }

        if (
          betDocument.closePanna !== undefined &&
          typeof underNo === "string" &&
          underNo.length === 3
        ) {
          betDocument.closePanna = underNo;
        }
      }

      /* ---- UPDATE AMOUNT ---- */
      if (amountPerUnderNo !== undefined) {
        const amt = Number(amountPerUnderNo);

        if (betDocument.amount !== undefined) betDocument.amount = amt;
        if (betDocument.amountPerUnderNo !== undefined)
          betDocument.amountPerUnderNo = amt;
        if (betDocument.totalAmount !== undefined)
          betDocument.totalAmount = amt;
      }

      /* ---- RESET RESULT ---- */
      if (betDocument.winAmount !== undefined) betDocument.winAmount = 0;

      if (betDocument.resultStatus !== undefined)
        betDocument.resultStatus = "PENDING";
    }

    /* ================= SAVE ================= */
    await betDocument.save();

    return res.status(200).json({
      success: true,
      message: "Bet updated successfully",
      data: betDocument,
    });
  } catch (err) {
    console.error("Update Bid amount and number Error:", err);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

exports.viewThisGameAllPendingResult = async (req, res) => {
  try {
    /* ================= ADMIN AUTH ================= */
    if (
      !req.session.isLoggedIn ||
      !req.session.admin ||
      req.session.admin.role !== "admin"
    ) {
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

    const { betId } = req.query;

    if (!betId) {
      return res.status(400).json({
        success: false,
        message: "Bet ID required",
      });
    }

    /* ================= ALL MODELS ================= */
    const betModels = [
      SingleDigitBet,
      SingleBulkDigitBet,
      JodiDigitBet,
      JodiDigitBulkBet,
      SinglePannaBet,
      SinglePannaBulkBet,
      DoublePannaBet,
      DoublePannaBulkBet,
      TriplePannaBet,
      OddEvenBet,
      HalfSangamBet,
      FullSangamBet,
      SPMotorBet,
      DPMotorBet,
      spdptpBet,
      RedBracketBet,
    ];

    let betDocument = null;
    let subBet = null;

    /* ================= FIND BET ================= */
    for (const model of betModels) {
      // direct id
      let found = await model.findById(betId);
      if (found) {
        betDocument = found;
        subBet = found;
        break;
      }

      // subdocument id
      found = await model.findOne({ "bets._id": betId });
      if (found) {
        betDocument = found;
        subBet = found.bets.id(betId);
        break;
      }
    }

    if (!betDocument || !subBet) {
      return res.status(404).json({
        success: false,
        message: "Bet not found",
      });
    }

    /* ================= EXTRACT VALUES ================= */

    const bidValue = [
      subBet.underNo,
      subBet.number,
      subBet.closePanna,
      subBet.closeDigit,
    ].find((v) => v !== undefined && v !== null);

    const bidAmount =
      [subBet.amountPerUnderNo, subBet.amount, subBet.totalAmount].find(
        (v) => v !== undefined && v !== null,
      ) ?? 0;

    /* ================= FIND ALL PENDING IN SAME MARKET ================= */

    let allMarketPendingBets = [];

    const userId = betDocument.userId;
    const gameName = betDocument.gameName;

    for (const model of betModels) {
      const docs = await model
        .find({
          userId,
          gameName,
        })
        .lean();

      docs.forEach((doc) => {
        if (Array.isArray(doc.bets)) {
          doc.bets.forEach((sub) => {
            if (sub.resultStatus === "PENDING") {
              allMarketPendingBets.push({
                betId: sub._id,
                gameType: doc.gameType,
                gameName: doc.gameName,
                session: sub.mode || sub.session || "",
                digit:
                  sub.underNo || sub.number || sub.closePanna || sub.closeDigit,
                amount: sub.amountPerUnderNo || sub.amount || sub.totalAmount,
                createdAt: doc.createdAt,
              });
            }
          });
        } else {
          if (doc.resultStatus === "PENDING") {
            allMarketPendingBets.push({
              betId: doc._id,
              gameType: doc.gameType,
              gameName: doc.gameName,
              session: doc.mode || doc.session || "",
              digit:
                doc.underNo || doc.number || doc.closePanna || doc.closeDigit,
              amount: doc.amountPerUnderNo || doc.amount || doc.totalAmount,
              createdAt: doc.createdAt,
            });
          }
        }
      });
    }

    /* ================= SEARCH FILTER ================= */

    const { search } = req.query;

    if (search && search.trim() !== "") {
      const searchLower = search.toLowerCase().trim();

      allMarketPendingBets = allMarketPendingBets.filter((bet) => {
        const market = bet.gameName ? bet.gameName.toLowerCase() : "";
        const type = bet.gameType ? bet.gameType.toLowerCase() : "";
        const session = bet.session ? bet.session.toLowerCase() : "";
        const digit =
          bet.digit !== undefined && bet.digit !== null
            ? bet.digit.toString().toLowerCase()
            : "";

        return (
          market.includes(searchLower) ||
          type.includes(searchLower) ||
          session.includes(searchLower) ||
          digit.includes(searchLower)
        );
      });
    }
    /* ================= PAGINATION ================= */

    let { page = 1, limit = 10 } = req.query;

    page = parseInt(page);
    limit = limit === "All" ? "All" : parseInt(limit);

    const totalRecords = allMarketPendingBets.length;

    let paginatedData = [];
    let totalPages = 1;

    if (limit === "All") {
      paginatedData = allMarketPendingBets;
    } else {
      totalPages = Math.ceil(totalRecords / limit);
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      paginatedData = allMarketPendingBets.slice(startIndex, endIndex);
    }
    /* ================= RENDER ================= */
    res.render("Admin/viewThisGameAllPendingResult", {
      pageTitle: "Admin View Result",
      admin,
      isLoggedIn: req.session.isLoggedIn,
      betId,
      bidValue,
      bidAmount,
      allMarketPendingBets: paginatedData,
      totalRecords,
      totalPages,
      currentPage: page,
      limit,
      search,
    });
  } catch (err) {
    console.error("View this game all pending result Error:", err);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// starline game preview winner list
exports.starlinePreviewWinnerList = async (req, res) => {
  try {
    // ================= AUTH CHECK =================
    if (
      !req.session.isLoggedIn ||
      !req.session.admin ||
      req.session.admin.role !== "admin"
    ) {
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

    const { gameName, session, panna, digit, resultDate } = req.body;

    if (!gameName || !session || !panna || !digit || !resultDate) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    const ist = DateTime.fromISO(resultDate, { zone: "Asia/Kolkata" });
    const formattedDate = ist.toFormat("yyyy-MM-dd");

    // =========================================================
    // 🔥 MASTER HELPER (MULTI BET SAFE)
    // =========================================================

    const findAndFilterBets = async (Model, elemMatch) => {
      const docs = await Model.find({
        gameName,
        playedDate: formattedDate,
        bets: { $elemMatch: elemMatch },
      })
        .populate("userId")
        .lean();

      return docs
        .map((doc) => ({
          _id: doc._id,
          gameName: doc.gameName,
          gameType: doc.gameType,
          userId: doc.userId,
          bets: doc.bets.filter((bet) =>
            Object.keys(elemMatch).every((key) => {
              const condition = elemMatch[key];

              if (condition?.$regex) {
                return new RegExp(condition.$regex).test(bet[key]);
              }

              return bet[key] === condition;
            }),
          ),
        }))
        .filter((doc) => doc.bets.length > 0);
    };

    // =========================================================
    // 1️⃣ STARLINE SINGLE DIGIT
    // =========================================================

    const singleDigitMatch = {
      number: Number(digit),
      mode: session,
      resultStatus: "PENDING",
    };

    // =========================================================
    // 2️⃣ STARLINE PANNA TYPES
    // =========================================================

    const pannaMatch = {
      underNo: panna,
      mode: session,
      resultStatus: "PENDING",
    };

    const tripleMatch = {
      number: panna,
      mode: session,
      resultStatus: "PENDING",
    };

    const [singleDigitData, singlePannaData, doublePannaData, triplePannaData] =
      await Promise.all([
        findAndFilterBets(StarlineSingleDigitBet, singleDigitMatch),
        findAndFilterBets(StarlineSinglePannaBet, pannaMatch),
        findAndFilterBets(StarlineDoublePannaBet, pannaMatch),
        findAndFilterBets(StarlineTriplePannaBet, tripleMatch),
      ]);

    // =========================================================
    // 🔥 MERGE ALL STARLINE DATA
    // =========================================================

    const finalData = [
      ...singleDigitData,
      ...singlePannaData,
      ...doublePannaData,
      ...triplePannaData,
    ];

    return res.status(200).json({
      success: true,
      count: finalData.length,
      data: finalData,
    });
  } catch (error) {
    console.error("Starline Preview Winner Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

exports.starlineChangeBidNumberAndAmount = async (req, res) => {
  try {
    /* ================= ADMIN AUTH ================= */
    if (
      !req.session.isLoggedIn ||
      !req.session.admin ||
      req.session.admin.role !== "admin"
    ) {
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

    /* ================= REQUEST DATA ================= */
    const { betId, underNo, amountPerUnderNo } = req.body;

    if (!betId) {
      return res.status(400).json({
        success: false,
        message: "Bet ID required",
      });
    }

    /* ================= STARLINE MODELS ONLY ================= */
    const betModels = [
      StarlineSingleDigitBet,
      StarlineSinglePannaBet,
      StarlineDoublePannaBet,
      StarlineTriplePannaBet,
    ];

    let betDocument = null;

    /* ================= FIND BET ================= */
    for (const model of betModels) {
      let found = await model.findById(betId);
      if (found) {
        betDocument = found;
        break;
      }

      found = await model.findOne({ "bets._id": betId });
      if (found) {
        betDocument = found;
        break;
      }
    }

    if (!betDocument) {
      return res.status(404).json({
        success: false,
        message: "Bet not found",
      });
    }

    /* ================= UPDATE LOGIC ================= */

    if (Array.isArray(betDocument.bets)) {
      /* ===== ARRAY BET ===== */
      const subBet = betDocument.bets.id(betId);

      if (!subBet) {
        return res.status(404).json({
          success: false,
          message: "Sub bet not found",
        });
      }

      /* ---- UPDATE NUMBER ---- */
      if (underNo !== undefined) {
        if (subBet.underNo !== undefined) subBet.underNo = underNo;
        if (subBet.number !== undefined) subBet.number = underNo;
      }

      /* ---- UPDATE AMOUNT ---- */
      if (amountPerUnderNo !== undefined) {
        const amt = Number(amountPerUnderNo);

        if (subBet.amount !== undefined) subBet.amount = amt;
        if (subBet.amountPerUnderNo !== undefined)
          subBet.amountPerUnderNo = amt;
        if (subBet.totalAmount !== undefined) subBet.totalAmount = amt;
      }

      /* ---- RESET RESULT ---- */
      if (subBet.winAmount !== undefined) subBet.winAmount = 0;
      if (subBet.resultStatus !== undefined) subBet.resultStatus = "PENDING";
    } else {
      /* ===== SINGLE OBJECT BET ===== */

      if (underNo !== undefined) {
        if (betDocument.underNo !== undefined) betDocument.underNo = underNo;

        if (betDocument.number !== undefined) betDocument.number = underNo;
      }

      if (amountPerUnderNo !== undefined) {
        const amt = Number(amountPerUnderNo);

        if (betDocument.amount !== undefined) betDocument.amount = amt;

        if (betDocument.amountPerUnderNo !== undefined)
          betDocument.amountPerUnderNo = amt;

        if (betDocument.totalAmount !== undefined)
          betDocument.totalAmount = amt;
      }

      if (betDocument.winAmount !== undefined) betDocument.winAmount = 0;

      if (betDocument.resultStatus !== undefined)
        betDocument.resultStatus = "PENDING";
    }

    /* ================= SAVE ================= */
    await betDocument.save();

    return res.status(200).json({
      success: true,
      message: "Starline bet updated successfully",
      data: betDocument,
    });
  } catch (err) {
    console.error("Starline Update Error:", err);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

exports.viewStarlineThisGameAllPendingResult = async (req, res) => {
  try {
    /* ================= ADMIN AUTH ================= */
    if (
      !req.session.isLoggedIn ||
      !req.session.admin ||
      req.session.admin.role !== "admin"
    ) {
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

    const { betId } = req.query;

    if (!betId) {
      return res.status(400).json({
        success: false,
        message: "Bet ID required",
      });
    }

    /* ================= STARLINE MODELS ================= */
    const betModels = [
      StarlineSingleDigitBet,
      StarlineSinglePannaBet,
      StarlineDoublePannaBet,
      StarlineTriplePannaBet,
    ];

    let betDocument = null;
    let subBet = null;

    /* ================= FIND BET ================= */
    for (const model of betModels) {
      let found = await model.findById(betId);
      if (found) {
        betDocument = found;
        subBet = found;
        break;
      }

      found = await model.findOne({ "bets._id": betId });
      if (found) {
        betDocument = found;
        subBet = found.bets.id(betId);
        break;
      }
    }

    if (!betDocument || !subBet) {
      return res.status(404).json({
        success: false,
        message: "Bet not found",
      });
    }

    /* ================= EXTRACT VALUES ================= */

    const bidValue = [subBet.underNo, subBet.number].find(
      (v) => v !== undefined && v !== null,
    );

    const bidAmount =
      [subBet.amountPerUnderNo, subBet.amount, subBet.totalAmount].find(
        (v) => v !== undefined && v !== null,
      ) ?? 0;

    /* ================= FIND ALL PENDING IN SAME MARKET ================= */

    let allMarketPendingBets = [];

    const userId = betDocument.userId;
    const gameName = betDocument.gameName;

    for (const model of betModels) {
      const docs = await model
        .find({
          userId,
          gameName,
        })
        .lean();

      docs.forEach((doc) => {
        if (Array.isArray(doc.bets)) {
          doc.bets.forEach((sub) => {
            if (sub.resultStatus === "PENDING") {
              allMarketPendingBets.push({
                betId: sub._id,
                gameType: doc.gameType,
                gameName: doc.gameName,
                session: sub.mode || "",
                digit: sub.underNo || sub.number,
                amount: sub.amountPerUnderNo || sub.amount || sub.totalAmount,
                createdAt: doc.createdAt,
              });
            }
          });
        } else {
          if (doc.resultStatus === "PENDING") {
            allMarketPendingBets.push({
              betId: doc._id,
              gameType: doc.gameType,
              gameName: doc.gameName,
              session: doc.mode || "",
              digit: doc.underNo || doc.number,
              amount: doc.amountPerUnderNo || doc.amount || doc.totalAmount,
              createdAt: doc.createdAt,
            });
          }
        }
      });
    }

    /* ================= SEARCH FILTER ================= */

    const { search } = req.query;

    if (search && search.trim() !== "") {
      const searchLower = search.toLowerCase().trim();

      allMarketPendingBets = allMarketPendingBets.filter((bet) => {
        const market = bet.gameName?.toLowerCase() || "";
        const type = bet.gameType?.toLowerCase() || "";
        const session = bet.session?.toLowerCase() || "";
        const digit =
          bet.digit !== undefined && bet.digit !== null
            ? bet.digit.toString().toLowerCase()
            : "";

        return (
          market.includes(searchLower) ||
          type.includes(searchLower) ||
          session.includes(searchLower) ||
          digit.includes(searchLower)
        );
      });
    }

    /* ================= PAGINATION ================= */

    let { page = 1, limit = 10 } = req.query;

    page = parseInt(page);
    limit = limit === "All" ? "All" : parseInt(limit);

    const totalRecords = allMarketPendingBets.length;

    let paginatedData = [];
    let totalPages = 1;

    if (limit === "All") {
      paginatedData = allMarketPendingBets;
    } else {
      totalPages = Math.ceil(totalRecords / limit);
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      paginatedData = allMarketPendingBets.slice(startIndex, endIndex);
    }

    /* ================= RENDER ================= */

    res.render("Admin/viewStarlineThisGameAllPendingResult", {
      pageTitle: "Starline View Result",
      admin,
      isLoggedIn: req.session.isLoggedIn,
      betId,
      bidValue,
      bidAmount,
      allMarketPendingBets: paginatedData,
      totalRecords,
      totalPages,
      currentPage: page,
      limit,
      search,
    });
  } catch (err) {
    console.error("View Starline Pending Result Error:", err);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Jackpot game preview winner list
exports.jackpotPreviewWinnerList = async (req, res) => {
  try {
    /* ================= ADMIN AUTH ================= */
    if (
      !req.session.isLoggedIn ||
      !req.session.admin ||
      req.session.admin.role !== "admin"
    ) {
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

    const { gameName, left, right, resultDate } = req.body;

    if (!gameName || !left || !right || !resultDate) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    const ist = DateTime.fromISO(resultDate, { zone: "Asia/Kolkata" });
    const formattedDate = ist.toFormat("yyyy-MM-dd");

    /* =========================================================
       🔥 MASTER HELPER
    ========================================================= */

    const findAndFilterBets = async (Model, elemMatch) => {
      const docs = await Model.find({
        gameName,
        playedDate: formattedDate,
        bets: { $elemMatch: elemMatch },
      })
        .populate("userId")
        .lean();

      return docs
        .map((doc) => ({
          _id: doc._id,
          gameName: doc.gameName,
          gameType: doc.gameType,
          userId: doc.userId,
          bets: doc.bets.filter((bet) =>
            Object.keys(elemMatch).every((key) => {
              return String(bet[key]) === String(elemMatch[key]); // ✅ SAFE MATCH
            }),
          ),
        }))
        .filter((doc) => doc.bets.length > 0);
    };

    const leftMatch = {
      openDigit: String(left),
      resultStatus: "PENDING",
    };

    const rightMatch = {
      openDigit: String(right),
      resultStatus: "PENDING",
    };

    /* =========================================================
       3️⃣ CENTER JODI MATCH
       (Example: left=2 right=5 → "25")
    ========================================================= */

    const centerJodiMatch = {
      openDigit: `${left}${right}`,
      resultStatus: "PENDING",
    };

    const [leftDigitData, rightDigitData, centerJodiData] = await Promise.all([
      findAndFilterBets(LeftDigitBet, leftMatch),
      findAndFilterBets(RightDigitBet, rightMatch),
      findAndFilterBets(CenterJodiDigitBet, centerJodiMatch),
    ]);

    /* =========================================================
       🔥 MERGE ALL JACKPOT DATA
    ========================================================= */

    const finalData = [...leftDigitData, ...rightDigitData, ...centerJodiData];

    return res.status(200).json({
      success: true,
      count: finalData.length,
      data: finalData,
    });
  } catch (error) {
    console.error("Jackpot Preview Winner Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

exports.jackpotChangeBidNumberAndAmount = async (req, res) => {
  try {
    /* ================= ADMIN AUTH ================= */
    if (
      !req.session.isLoggedIn ||
      !req.session.admin ||
      req.session.admin.role !== "admin"
    ) {
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
    /* ================= REQUEST DATA ================= */
    const { betId, openDigit, amount } = req.body;

    if (!betId) {
      return res.status(400).json({
        success: false,
        message: "Bet ID required",
      });
    }

    /* ================= JACKPOT MODELS ================= */
    const betModels = [LeftDigitBet, RightDigitBet, CenterJodiDigitBet];

    let betDocument = null;

    /* ================= FIND BET ================= */
    for (const model of betModels) {
      let found = await model.findById(betId);
      if (found) {
        betDocument = found;
        break;
      }

      found = await model.findOne({ "bets._id": betId });
      if (found) {
        betDocument = found;
        break;
      }
    }

    if (!betDocument) {
      return res.status(404).json({
        success: false,
        message: "Bet not found",
      });
    }

    /* ================= UPDATE LOGIC ================= */

    if (Array.isArray(betDocument.bets)) {
      const subBet = betDocument.bets.id(betId);

      if (!subBet) {
        return res.status(404).json({
          success: false,
          message: "Sub bet not found",
        });
      }

      /* ---- UPDATE DIGIT ---- */
      if (openDigit !== undefined) {
        if (subBet.openDigit !== undefined) subBet.openDigit = openDigit;
      }

      /* ---- UPDATE AMOUNT ---- */
      if (amount !== undefined) {
        const amt = Number(amount);

        if (subBet.amount !== undefined) subBet.amount = amt;

        if (subBet.amountPerUnderNo !== undefined)
          subBet.amountPerUnderNo = amt;

        if (subBet.totalAmount !== undefined) subBet.totalAmount = amt;
      }

      /* ---- RESET RESULT ---- */
      if (subBet.winAmount !== undefined) subBet.winAmount = 0;

      if (subBet.resultStatus !== undefined) subBet.resultStatus = "PENDING";
    } else {
      /* ===== SINGLE OBJECT BET ===== */

      if (openDigit !== undefined) {
        if (betDocument.openDigit !== undefined)
          betDocument.openDigit = openDigit;
      }

      if (amount !== undefined) {
        const amt = Number(amount);

        if (betDocument.amount !== undefined) betDocument.amount = amt;

        if (betDocument.amountPerUnderNo !== undefined)
          betDocument.amountPerUnderNo = amt;

        if (betDocument.totalAmount !== undefined)
          betDocument.totalAmount = amt;
      }

      if (betDocument.winAmount !== undefined) betDocument.winAmount = 0;

      if (betDocument.resultStatus !== undefined)
        betDocument.resultStatus = "PENDING";
    }

    /* ================= SAVE ================= */
    await betDocument.save();

    return res.status(200).json({
      success: true,
      message: "Jackpot bet updated successfully",
      data: betDocument,
    });
  } catch (err) {
    console.error("Jackpot Update Error:", err);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

exports.viewJackpotThisGameAllPendingResult = async (req, res) => {
  try {
    /* ================= ADMIN AUTH ================= */
    if (
      !req.session.isLoggedIn ||
      !req.session.admin ||
      req.session.admin.role !== "admin"
    ) {
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

    const { betId } = req.query;

    if (!betId) {
      return res.status(400).json({
        success: false,
        message: "Bet ID required",
      });
    }

    /* ================= JACKPOT MODELS ================= */
    const betModels = [LeftDigitBet, RightDigitBet, CenterJodiDigitBet];

    let betDocument = null;
    let subBet = null;

    /* ================= FIND BET ================= */
    for (const model of betModels) {
      let found = await model.findById(betId);
      if (found) {
        betDocument = found;
        subBet = found;
        break;
      }

      found = await model.findOne({ "bets._id": betId });
      if (found) {
        betDocument = found;
        subBet = found.bets.id(betId);
        break;
      }
    }

    if (!betDocument || !subBet) {
      return res.status(404).json({
        success: false,
        message: "Bet not found",
      });
    }

    /* ================= EXTRACT VALUES ================= */

    const bidValue = subBet.openDigit ?? null;

    const bidAmount =
      [subBet.amount, subBet.amountPerUnderNo, subBet.totalAmount].find(
        (v) => v !== undefined && v !== null,
      ) ?? 0;

    /* ================= FIND ALL PENDING IN SAME MARKET ================= */

    let allMarketPendingBets = [];

    const userId = betDocument.userId;
    const gameName = betDocument.gameName;

    for (const model of betModels) {
      const docs = await model
        .find({
          userId,
          gameName,
        })
        .lean();

      docs.forEach((doc) => {
        if (Array.isArray(doc.bets)) {
          doc.bets.forEach((sub) => {
            if (sub.resultStatus === "PENDING") {
              allMarketPendingBets.push({
                betId: sub._id,
                gameType: doc.gameType,
                gameName: doc.gameName,
                session: sub.mode || "",
                digit: sub.openDigit,
                amount: sub.amount || sub.amountPerUnderNo || sub.totalAmount,
                createdAt: doc.createdAt,
              });
            }
          });
        } else {
          if (doc.resultStatus === "PENDING") {
            allMarketPendingBets.push({
              betId: doc._id,
              gameType: doc.gameType,
              gameName: doc.gameName,
              session: doc.mode || "",
              digit: doc.openDigit,
              amount: doc.amount || doc.amountPerUnderNo || doc.totalAmount,
              createdAt: doc.createdAt,
            });
          }
        }
      });
    }

    /* ================= SEARCH FILTER ================= */

    const { search } = req.query;

    if (search && search.trim() !== "") {
      const searchLower = search.toLowerCase().trim();

      allMarketPendingBets = allMarketPendingBets.filter((bet) => {
        const market = bet.gameName?.toLowerCase() || "";
        const type = bet.gameType?.toLowerCase() || "";
        const session = bet.session?.toLowerCase() || "";
        const digit =
          bet.digit !== undefined && bet.digit !== null
            ? bet.digit.toString().toLowerCase()
            : "";

        return (
          market.includes(searchLower) ||
          type.includes(searchLower) ||
          session.includes(searchLower) ||
          digit.includes(searchLower)
        );
      });
    }

    /* ================= PAGINATION ================= */

    let { page = 1, limit = 10 } = req.query;

    page = parseInt(page);
    limit = limit === "All" ? "All" : parseInt(limit);

    const totalRecords = allMarketPendingBets.length;

    let paginatedData = [];
    let totalPages = 1;

    if (limit === "All") {
      paginatedData = allMarketPendingBets;
    } else {
      totalPages = Math.ceil(totalRecords / limit);
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      paginatedData = allMarketPendingBets.slice(startIndex, endIndex);
    }

    /* ================= RENDER ================= */

    res.render("Admin/viewJackpotThisGameAllPendingResult", {
      pageTitle: "Jackpot View Result",
      admin,
      isLoggedIn: req.session.isLoggedIn,
      betId,
      bidValue,
      bidAmount,
      allMarketPendingBets: paginatedData,
      totalRecords,
      totalPages,
      currentPage: page,
      limit,
      search,
    });
  } catch (err) {
    console.error("View Jackpot Pending Result Error:", err);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Admin Generate fake result in bulk
exports.getAdminGenerateResultPage = async (req, res) => {
  try {
    /* ================= ADMIN AUTH ================= */
    if (
      !req.session.isLoggedIn ||
      !req.session.admin ||
      req.session.admin.role !== "admin"
    ) {
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

    // ✅ Only Normal Games (No Starline, No Jackpot)
    const normalGames = await Game.find({
      isDeleted: false,
      isStarline: false,
      isJackpot: false,
    }).sort({ gameName: 1 });

    // ✅ Only Starline Games
    const starlineGames = await Game.find({
      isDeleted: false,
      isStarline: true,
      isJackpot: false,
    }).sort({ gameName: 1 });

    const jackpotGames = await Game.find({
      isDeleted: false,
      isStarline: false,
      isJackpot: true,
    }).sort({ gameName: 1 });

    res.render("Admin/adminGenerateResult", {
      pageTitle: "Admin Generate Result",
      admin,
      normalGames,
      starlineGames,
      jackpotGames,
      isLoggedIn: req.session.isLoggedIn,
    });
  } catch (err) {
    console.error("Admin Generate Result Page Error:", err);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const panaToDigit = require("../utils/panaToDigit");
exports.generateNormalGameResult = async (req, res) => {
  try {
    /* ================= ADMIN AUTH ================= */
    if (
      !req.session.isLoggedIn ||
      !req.session.admin ||
      req.session.admin.role !== "admin"
    ) {
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

    const { fromDate, toDate, gameId } = req.body;

    if (!fromDate || !toDate || !gameId) {
      return res
        .status(400)
        .json({ success: false, message: "All fields required" });
    }

    if (!mongoose.Types.ObjectId.isValid(gameId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid Game ID" });
    }

    const game = await Game.findOne({
      _id: gameId,
      isDeleted: false,
      isStarline: false,
      isJackpot: false,
    });

    if (!game) {
      return res
        .status(404)
        .json({ success: false, message: "Game not found" });
    }

    let start = new Date(fromDate);
    let end = new Date(toDate);

    const pannaKeys = Object.keys(panaToDigit);
    const results = [];

    while (start <= end) {
      const formattedDate = start.toLocaleDateString("en-CA", {
        timeZone: "Asia/Kolkata",
      });
      const weekday = start.toLocaleString("en-US", {
        weekday: "long",
        timeZone: "Asia/Kolkata",
      });

      /* 🔥 DUPLICATE CHECK */
      const alreadyDeclared = await GameResult.findOne({
        gameName: game.gameName,
        resultDate: formattedDate,
      });

      if (alreadyDeclared) {
        start.setDate(start.getDate() + 1);
        continue; // Skip this date
      }

      const openPanna = pannaKeys[Math.floor(Math.random() * pannaKeys.length)];

      let closePanna;
      do {
        closePanna = pannaKeys[Math.floor(Math.random() * pannaKeys.length)];
      } while (closePanna === openPanna);

      results.push({
        gameName: game.gameName,
        session: "OPEN",
        panna: openPanna,
        digit: panaToDigit[openPanna],
        resultDate: formattedDate,
        resultWeekday: weekday,
        resultTime: game.schedule?.[weekday.toLowerCase()]?.openTime || "",
      });

      results.push({
        gameName: game.gameName,
        session: "CLOSE",
        panna: closePanna,
        digit: panaToDigit[closePanna],
        resultDate: formattedDate,
        resultWeekday: weekday,
        resultTime: game.schedule?.[weekday.toLowerCase()]?.closeTime || "",
      });

      start.setDate(start.getDate() + 1);
    }

    if (results.length === 0) {
      return res.json({
        success: false,
        message: "All selected dates already declared",
      });
    }

    await GameResult.insertMany(results);

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false });
  }
};

exports.generateStarlineGameResult = async (req, res) => {
  try {
    /* ================= ADMIN AUTH ================= */
    if (
      !req.session.isLoggedIn ||
      !req.session.admin ||
      req.session.admin.role !== "admin"
    ) {
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

    const { fromDate, toDate, starlineGameId } = req.body;

    if (!fromDate || !toDate || !starlineGameId) {
      return res
        .status(400)
        .json({ success: false, message: "All fields required" });
    }

    if (!mongoose.Types.ObjectId.isValid(starlineGameId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid Game ID" });
    }

    const game = await Game.findOne({
      _id: starlineGameId,
      isDeleted: false,
      isStarline: true,
      isJackpot: false,
    });

    if (!game) {
      return res
        .status(404)
        .json({ success: false, message: "Game not found" });
    }

    let start = new Date(fromDate);
    let end = new Date(toDate);

    const pannaKeys = Object.keys(panaToDigit);
    const results = [];

    while (start <= end) {
      const formattedDate = start.toLocaleDateString("en-CA", {
        timeZone: "Asia/Kolkata",
      });
      const weekday = start.toLocaleString("en-US", {
        weekday: "long",
        timeZone: "Asia/Kolkata",
      });

      /* 🔥 DUPLICATE CHECK */
      const alreadyDeclared = await starlineGameDeclareResult.findOne({
        gameName: game.gameName,
        resultDate: formattedDate,
      });

      if (alreadyDeclared) {
        start.setDate(start.getDate() + 1);
        continue;
      }

      const openPanna = pannaKeys[Math.floor(Math.random() * pannaKeys.length)];

      /* 👈 ONLY OPEN SESSION */
      results.push({
        gameName: game.gameName,
        session: "OPEN",
        panna: openPanna,
        digit: panaToDigit[openPanna],
        resultDate: formattedDate,
        resultWeekday: weekday,
        resultTime: game.schedule?.[weekday.toLowerCase()]?.openTime || "",
      });

      start.setDate(start.getDate() + 1);
    }

    if (results.length === 0) {
      return res.json({
        success: false,
        message: "All selected dates already declared",
      });
    }

    await starlineGameDeclareResult.insertMany(results);

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false });
  }
};

exports.generateJackpotGameResult = async (req, res) => {
  try {
    /* ================= ADMIN AUTH ================= */
    if (
      !req.session.isLoggedIn ||
      !req.session.admin ||
      req.session.admin.role !== "admin"
    ) {
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
    const { fromDate, toDate, jackpotGameId } = req.body;

    if (!fromDate || !toDate || !jackpotGameId) {
      return res
        .status(400)
        .json({ success: false, message: "All fields required" });
    }

    if (!mongoose.Types.ObjectId.isValid(jackpotGameId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid Game ID" });
    }

    const game = await Game.findOne({
      _id: jackpotGameId,
      isDeleted: false,
      isJackpot: true,
    });

    if (!game) {
      return res
        .status(404)
        .json({ success: false, message: "Game not found" });
    }

    let start = new Date(fromDate);
    let end = new Date(toDate);

    const results = [];

    while (start <= end) {
      const formattedDate = start.toLocaleDateString("en-CA", {
        timeZone: "Asia/Kolkata",
      });
      const weekday = start.toLocaleString("en-US", {
        weekday: "long",
        timeZone: "Asia/Kolkata",
      });

      /* 🔥 DUPLICATE CHECK */
      const alreadyDeclared = await JackpotGameResult.findOne({
        gameName: game.gameName,
        resultDate: formattedDate,
      });

      if (alreadyDeclared) {
        start.setDate(start.getDate() + 1);
        continue;
      }

      /* 🎯 Random Digits */
      const leftDigit = Math.floor(Math.random() * 10);
      const rightDigit = Math.floor(Math.random() * 10);

      /* 🎯 Jodi as 2-digit string */
      const jodi = `${leftDigit}${rightDigit}`; // Always 2 digits

      results.push({
        gameName: game.gameName,
        left: leftDigit.toString(),
        right: rightDigit.toString(),
        jodi: jodi,
        resultDate: formattedDate,
        resultWeekday: weekday,
        resultTime: game.schedule?.[weekday.toLowerCase()]?.time || "",
      });

      start.setDate(start.getDate() + 1);
    }

    if (results.length === 0) {
      return res.json({
        success: false,
        message: "All selected dates already declared",
      });
    }

    await JackpotGameResult.insertMany(results);

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false });
  }
};

// Get Admin Notifications with pagination & search
exports.getAdminNotifications = async (req, res) => {
  try {
    // ================= ADMIN AUTH =================
    if (
      !req.session.isLoggedIn ||
      !req.session.admin ||
      req.session.admin.role !== "admin"
    ) {
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

    // ================= PAGINATION & SEARCH =================
    let page = parseInt(req.query.page) || 1;
    let limit = parseInt(req.query.limit) || 10;
    let search = req.query.search ? req.query.search.trim() : "";

    // Build query
    const query = search
      ? { title: { $regex: search, $options: "i" } } // case-insensitive search
      : {};

    const total = await bellNotification.countDocuments(query);
    const totalPages = Math.ceil(total / limit);

    // Ensure page is within bounds
    if (page > totalPages && totalPages > 0) page = totalPages;
    if (page < 1) page = 1;

    const notifications = await bellNotification
      .find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    // Render view
    res.render("Admin/adminBellNotifications", {
      pageTitle: "Admin Notifications",
      admin,
      isLoggedIn: req.session.isLoggedIn,
      notifications,
      page,
      totalPages,
      limit,
      total,
      search,
    });
  } catch (error) {
    console.error("Get Admin Notifications Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

exports.postAdminNotifications = async (req, res) => {
  try {
    /* ================= ADMIN AUTH ================= */
    if (
      !req.session.isLoggedIn ||
      !req.session.admin ||
      req.session.admin.role !== "admin"
    ) {
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

    let { title, message } = req.body;

    if (!title || !message) {
      return res.status(400).json({
        success: false,
        message: "Title and message are required",
      });
    }

    // 🔥 Make title uppercase
    title = title.toUpperCase();

    const notification = new bellNotification({
      title: title,
      message: message,
    });

    await notification.save();

    res.json({ success: true, message: "Notification created successfully" });
  } catch (error) {
    console.error("Post Admin Notifications Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

exports.deleteNotification = async (req, res) => {
  try {
    // ================= ADMIN AUTH =================
    if (
      !req.session.isLoggedIn ||
      !req.session.admin ||
      req.session.admin.role !== "admin"
    ) {
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

    // ================= DELETE NOTIFICATION =================
    const notificationId = req.params.id;

    const notification = await bellNotification.findById(notificationId);
    if (!notification) {
      req.flash("error", "Notification not found");
      return res.redirect("/admin/bell-notifications");
    }

    await bellNotification.findByIdAndDelete(notificationId);
    res.redirect("/admin/bell-notifications");
  } catch (error) {
    console.error("Delete Notification Error:", error);
    req.flash("error", "Server error, could not delete notification");
    return res.redirect("/admin/bell-notifications");
  }
};

exports.getSendNotificationPage = async (req, res) => {
  try {
    if (
      !req.session.isLoggedIn ||
      !req.session.admin ||
      req.session.admin.role !== "admin"
    ) {
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

    const user = await User.find({
      role: "user",
      userStatus: "active",
    });

    res.render("Admin/adminSendNotification", {
      pageTitle: "Send Notification",
      admin,
      user,
      isLoggedIn: req.session.isLoggedIn,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Server Error");
  }
};

// exports.sendNotification = async (req, res) => {
//   try {
//         console.log("🔥 sendNotification route hit");
//     console.log("📦 BODY:", req.body);
//     const { title, message, userId } = req.body;

//     if (!title || !message) {
//       console.log("❌ Title or message missing");
//       return res.redirect("/admin/send-notification");
//     }

//     // 🎯 ===============================
//     // 🎯 SEND TO SPECIFIC USER
//     // 🎯 ===============================
//     if (userId) {

//       const user = await User.findById(userId);

//       if (!user) {
//         console.log("❌ User not found");
//         return res.redirect("/admin/send-notification");
//       }

//       if (user.fcmToken) {
//         try {
//           const response = await admin.messaging().send({
//             token: user.fcmToken,
//             notification: {
//               title: title,
//               body: message,
//             },
//           });

//           console.log("✅ FCM Response (Single User):", response);

//         } catch (fcmError) {
//           console.error("🔥 FCM Error (Single User):", fcmError.message);
//         }
//       } else {
//         console.log("❌ User has no FCM token");
//       }

//       await Notification.create({
//         title,
//         message,
//         user: userId
//       });

//       return res.redirect("/admin/send-notification");
//     }

//     // 🌍 ===============================
//     // 🌍 SEND TO ALL USERS
//     // 🌍 ===============================

//     const users = await User.find({
//       role: "user",
//       userStatus: "active",
//       fcmToken: { $exists: true, $ne: null }
//     });

//     const tokens = users.map(u => u.fcmToken);

//     console.log("📦 Total Active Users with Token:", tokens.length);

//     if (tokens.length > 0) {
//       try {
//         const response = await admin.messaging().sendEachForMulticast({
//           tokens: tokens,
//           notification: {
//             title,
//             body: message,
//           },
//         });

//         console.log("✅ FCM Multicast Response:");
//         console.log("✔ Success:", response.successCount);
//         console.log("❌ Failure:", response.failureCount);

//         if (response.failureCount > 0) {
//           response.responses.forEach((resp, idx) => {
//             if (!resp.success) {
//               console.error(
//                 `❌ Failed Token: ${tokens[idx]} →`,
//                 resp.error.message
//               );
//             }
//           });
//         }

//       } catch (fcmError) {
//         console.error("🔥 FCM Multicast Error:", fcmError.message);
//       }
//     } else {
//       console.log("❌ No users with valid FCM tokens found");
//     }

//     // Save notification in DB
//     const notifications = users.map(u => ({
//       title,
//       message,
//       user: u._id
//     }));

//     if (notifications.length > 0) {
//       await Notification.insertMany(notifications);
//     }

//     return res.redirect("/admin/send-notification");

//   } catch (error) {
//     console.error("🚨 Server Error:", error);
//     res.status(500).send("Server Error");
//   }
// };

// exports.sendNotification = async (req, res) => {
//   try {
//     console.log("🔥 sendNotification route hit");
//     console.log("📦 BODY:", req.body);

//     const { title, message, userId } = req.body;

//     if (!title || !message) {
//       console.log("❌ Title or message missing");
//       return res.redirect("/admin/send-notification");
//     }

//     // 🎯 SEND TO SPECIFIC USER
//     if (userId) {
//       const user = await User.findById(userId);

//       if (!user) {
//         console.log("❌ User not found");
//         return res.redirect("/admin/send-notification");
//       }

//       if (user.fcmToken) {
//         try {
//           const response = await admin.messaging().send({
//             token: user.fcmToken,
//             notification: {
//               title,
//               body: message,
//             },
//           });

//           console.log("✅ FCM Response (Single User):", response);
//         } catch (fcmError) {
//           console.error("🔥 FCM Error (Single User):", fcmError.message);
//         }
//       } else {
//         console.log("❌ User has no FCM token");
//       }

//       return res.redirect("/admin/send-notification");
//     }

//     // 🌍 SEND TO ALL USERS
//     const users = await User.find({
//       role: "user",
//       userStatus: "active",
//       fcmToken: { $exists: true, $ne: null }
//     });

//     const tokens = users.map(u => u.fcmToken);
//     console.log("📦 Total Active Users with Token:", tokens.length);

//     if (tokens.length > 0) {
//       try {
//         const response = await admin.messaging().sendEachForMulticast({
//           tokens,
//           notification: {
//             title,
//             body: message,
//           },
//         });

//         console.log("✅ FCM Multicast Response:");
//         console.log("✔ Success:", response.successCount);
//         console.log("❌ Failure:", response.failureCount);

//         if (response.failureCount > 0) {
//           response.responses.forEach((resp, idx) => {
//             if (!resp.success) {
//               console.error(`❌ Failed Token: ${tokens[idx]} →`, resp.error.message);
//             }
//           });
//         }
//       } catch (fcmError) {
//         console.error("🔥 FCM Multicast Error:", fcmError.message);
//       }
//     } else {
//       console.log("❌ No users with valid FCM tokens found");
//     }

//     return res.redirect("/admin/send-notification");

//   } catch (error) {
//     console.error("🚨 Server Error:", error);
//     res.status(500).send("Server Error");
//   }
// };

exports.sendNotification = async (req, res) => {
  try {
    if (
      !req.session.isLoggedIn ||
      !req.session.admin ||
      req.session.admin.role !== "admin"
    ) {
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
    console.log("🔥 sendNotification route hit");
    console.log("📦 BODY:", req.body);

    const { title, message, userId } = req.body;
    const trimmedUserId = userId?.trim(); // <-- trim userId

    if (!title || !message) {
      console.log("❌ Title or message missing");
      return res.redirect("/admin/send-notification");
    }

    console.log("🆔 Received userId:", JSON.stringify(trimmedUserId));

    // 🎯 SEND TO SPECIFIC USER
    if (trimmedUserId) {
      const user = await User.findById(trimmedUserId);

      if (!user) {
        console.log("❌ User not found");
        return res.redirect("/admin/send-notification");
      }

      if (user.fcmToken) {
        try {
          const response = await admin.messaging().send({
            token: user.fcmToken,
            notification: {
              title,
              body: message,
            },
          });
          console.log("✅ FCM Response (Single User):", response);
        } catch (fcmError) {
          console.error("🔥 FCM Error (Single User):", fcmError.message);
        }
      } else {
        console.log("❌ User has no FCM token");
      }

      // ✅ Done sending to specific user, exit
      return res.redirect("/admin/send-notification");
    }

    // 🌍 SEND TO ALL USERS (only if no specific user selected)
    const users = await User.find({
      role: "user",
      userStatus: "active",
      fcmToken: { $exists: true, $ne: null },
    });

    const tokens = users.map((u) => u.fcmToken);
    console.log("📦 Total Active Users with Token:", tokens.length);

    if (tokens.length > 0) {
      try {
        const response = await admin.messaging().sendEachForMulticast({
          tokens,
          notification: {
            title,
            body: message,
          },
        });

        console.log("✅ FCM Multicast Response:");
        console.log("✔ Success:", response.successCount);
        console.log("❌ Failure:", response.failureCount);

        if (response.failureCount > 0) {
          response.responses.forEach((resp, idx) => {
            if (!resp.success) {
              console.error(
                `❌ Failed Token: ${tokens[idx]} →`,
                resp.error.message,
              );
            }
          });
        }
      } catch (fcmError) {
        console.error("🔥 FCM Multicast Error:", fcmError.message);
      }
    } else {
      console.log("❌ No users with valid FCM tokens found");
    }

    return res.redirect("/admin/send-notification");
  } catch (error) {
    console.error("🚨 Server Error:", error);
    res.status(500).send("Server Error");
  }
};

exports.getChangePasswordPage = async (req, res) => {
  try {
    if (
      !req.session.isLoggedIn ||
      !req.session.admin ||
      req.session.admin.role !== "admin"
    ) {
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

    res.render("Admin/adminChangePassword", {
      pageTitle: "Change Password",
      admin,
      isLoggedIn: req.session.isLoggedIn,
    });
  } catch (error) {
    console.error("Get Change Password Page Error:", error);
    res.status(500).send("Server Error");
  }
};

// POST Change Password (returns JSON for AJAX)
exports.postChangePassword = async (req, res) => {
  try {
    // 1️⃣ Session validation
    if (
      !req.session.isLoggedIn ||
      !req.session.admin ||
      req.session.admin.role !== "admin"
    ) {
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

    const { oldPassword, newPassword, confirmPassword } = req.body;

    // 3️⃣ Check that all fields are provided
    if (!oldPassword || !newPassword || !confirmPassword) {
      return res.json({ error: "All fields are required" });
    }

    // 4️⃣ Verify old password
    const isMatch = await bcrypt.compare(oldPassword, admin.password);
    if (!isMatch) return res.json({ error: "Old password is incorrect" });

    // 5️⃣ Check new password match
    if (newPassword !== confirmPassword) {
      return res.json({
        error: "New password and confirm password do not match",
      });
    }

    // 6️⃣ Hash and save new password
    const salt = await bcrypt.genSalt(10);
    admin.password = await bcrypt.hash(newPassword, salt);
    await admin.save();

    res.json({ success: "Password updated successfully" });
  } catch (error) {
    console.error("Post Change Password Error:", error);
    res.status(500).json({ error: "Server error. Try again later." });
  }
};

const betModelsofall = [
  require("../model/SingleDigitBet"),
  require("../model/SingleBulkDigitBet"),
  require("../model/JodiDigitBet"),
  require("../model/JodiDigitBulkBet"),
  require("../model/SinglePannaBet"),
  require("../model/SinglePannaBulkBet"),
  require("../model/DoublePannaBet"),
  require("../model/DoublePannaBulkBet"),
  require("../model/TriplePannaBet"),
  require("../model/OddEvenBet"),
  require("../model/HalfSangamBet"),
  require("../model/FullSangamBet"),
  require("../model/SPMotorBet"),
  require("../model/DPMotorBet"),
  require("../model/spdptpBet"),
  require("../model/RedBracketBet"),
  require("../model/StarlineSingleDigitBet"),
  require("../model/StarlineSinglePannaBet"),
  require("../model/StarlineDoublePannaBet"),
  require("../model/StarlineTriplePannaBet"),
  require("../model/JackpotLeftDigitBet"),
  require("../model/JackpotRightDigitBet"),
  require("../model/JackpotCentreJodiDigitBet"),
];

exports.getWinningHistoryPage = async (req, res, next) => {
  try {
    if (
      !req.session.isLoggedIn ||
      !req.session.admin ||
      req.session.admin.role !== "admin"
    ) {
      return res.redirect("/admin/login");
    }

    const admin = await User.findOne({
      _id: req.session.admin._id,
      role: "admin",
      userStatus: "active",
    }).lean();

    if (!admin) {
      req.session.destroy();
      return res.redirect("/admin/login");
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const { source, userName, mainGame, gameName, startDate, endDate } =
      req.query;

    let fromDate = null;
    let toDate = null;
    const now = new Date();

    // SOURCE FILTER
    if (startDate && endDate) {
      fromDate = new Date(startDate);
      toDate = new Date(endDate);
      toDate.setHours(23, 59, 59, 999);
    } else if (source) {
      switch (source) {
        case "source1":
          fromDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          toDate = now;
          break;
        case "source3":
          fromDate = new Date();
          fromDate.setMonth(fromDate.getMonth() - 3);
          toDate = now;
          break;
        case "source2":
          fromDate = new Date();
          fromDate.setMonth(fromDate.getMonth() - 6);
          toDate = now;
          break;
      }
    }

    const dateFilter =
      fromDate && toDate ? { createdAt: { $gte: fromDate, $lte: toDate } } : {};

    let allWinRows = [];

    const mainGameMap = {
      "Main Market": "MAIN_GAME",
      Jackpot: "JACKPOT",
      Starline: "STARLINE",
    };

    const mainGameValue = mainGame ? mainGameMap[mainGame] : null;

    for (const Model of betModelsofall) {
      const query = { ...dateFilter };

      if (mainGameValue) query.mainGame = mainGameValue;
      if (gameName) query.gameName = { $regex: gameName, $options: "i" };

      const records = await Model.find(query)
        .populate("userId", "username phoneNo")
        .lean();

      records.forEach((bet) => {
        if (!Array.isArray(bet.bets)) return;

        bet.bets.forEach((b) => {
          if (b.resultStatus !== "WIN") return;

          if (userName && bet.userId?.username) {
            const dbName = bet.userId.username.toString().trim().toLowerCase();
            const searchName = userName.toString().trim().toLowerCase();

            if (!dbName.includes(searchName)) return;
          }

          const digits = [];

          [
            b.number,
            b.openDigit,
            b.closeDigit,
            b.openPanna,
            b.closePanna,
            b.underNo,
          ].forEach((v) => {
            if (v !== undefined && v !== null && v !== "") {
              digits.push(v);
            }
          });

          const marketMap = {
            MAIN_GAME: "Main Market",
            STARLINE: "Starline",
            JACKPOT: "Jackpot",
          };

          allWinRows.push({
            username: bet.userId?.username || "-",
            phoneNo: bet.userId?.phoneNo || "-",
            gameType: bet.gameType ?? "-",
            mainGame: marketMap[bet.mainGame] || "-",
            gameName: bet.gameName ?? "-",
            session: b.session ?? b.mode ?? "-",
            digits,
            amount: Number(
              b.amount ??
                b.totalPoints ??
                b.totalAmount ??
                b.amountPerUnderNo ??
                b.perUnderNosPoints ??
                0,
            ),
            winAmount: Number(b.winAmount ?? 0),
            createdAt: bet.createdAt,
          });
        });
      });
    }

    allWinRows.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const totalRecords = allWinRows.length;
    const totalPages = Math.ceil(totalRecords / limit);
    const startIndex = (page - 1) * limit;

    const paginatedData = allWinRows.slice(startIndex, startIndex + limit);

    res.render("Admin/adminWinningHistory", {
      admin,
      winHistory: paginatedData,
      page,
      limit,
      totalPages,
      totalRecords,
      source: source || "",
      userName: userName || "",
      mainGame: mainGame || "",
      gameName: gameName || "",
      startDate: startDate || "",
      endDate: endDate || "",
    });
  } catch (err) {
    console.error("ADMIN WIN HISTORY ERROR:", err);
    next(err);
  }
};

exports.getBidHistoryPage = async (req, res, next) => {
  try {
    if (
      !req.session.isLoggedIn ||
      !req.session.admin ||
      req.session.admin.role !== "admin"
    ) {
      return res.redirect("/admin/login");
    }

    const admin = await User.findOne({
      _id: req.session.admin._id,
      role: "admin",
      userStatus: "active",
    }).lean();

    if (!admin) {
      req.session.destroy();
      return res.redirect("/admin/login");
    }

    /* ================= AJAX USER SEARCH ================= */
    if (req.query.ajax === "userSearch") {
      const q = req.query.q?.trim();
      if (!q) return res.json([]);

      const users = await User.find({
        username: { $regex: q, $options: "i" },
        role: "user",
        userStatus: "active",
      })
        .select("username")
        .limit(10)
        .lean();

      return res.json(users);
    }

    /* ================= OLD GAME + GAMETYPE (UNCHANGED) ================= */
    const games = await Game.find({ isDeleted: false })
      .sort({ gameName: 1 })
      .lean();

    const gameTypes = betModelsofall
      .map((Model) => Model.schema.path("gameType")?.defaultValue)
      .filter(Boolean)
      .sort();

    /* ================= FILTERS (UNCHANGED STRUCTURE) ================= */
    const {
      fromDate,
      toDate,
      gameName,
      gameType,
      minAmount,
      username,
      page = 1,
      limit = 10,
      tableSearch,
    } = req.query;

    const currentPage = parseInt(page);
    const perPage = parseInt(limit);

    let userFilterId = null;

    if (username) {
      const user = await User.findOne({
        username: { $regex: username, $options: "i" },
        role: "user",
      }).select("_id");

      if (user) userFilterId = user._id;
      else userFilterId = "NO_MATCH";
    }

    let allBids = [];

    /* ================= MAIN LOOP ================= */
    for (const Model of betModelsofall) {
      const query = {};

      if (fromDate || toDate) {
        query.createdAt = {};
        if (fromDate) query.createdAt.$gte = new Date(fromDate);
        if (toDate) {
          const end = new Date(toDate);
          end.setHours(23, 59, 59, 999);
          query.createdAt.$lte = end;
        }
      }

      if (gameName) query.gameName = gameName;
      if (gameType) query.gameType = gameType;

      if (userFilterId) {
        if (userFilterId === "NO_MATCH") continue;
        query.userId = userFilterId;
      }

      const records = await Model.find(query)
        .populate("userId", "username phoneNo")
        .lean();

      records.forEach((bet) => {
        if (!Array.isArray(bet.bets)) return;

        bet.bets.forEach((b) => {
          const amount =
            b.amount ??
            b.totalPoints ??
            b.totalAmount ??
            b.amountPerUnderNo ??
            b.perUnderNosPoints ??
            0;

          if (minAmount && amount < Number(minAmount)) return;

          /* ===== TABLE SEARCH ===== */
          if (tableSearch) {
            const search = tableSearch.toLowerCase();

            const numberValue =
              b.mainNo !== undefined && b.underNo
                ? `${b.mainNo}-${b.underNo}`
                : (b.number ??
                  b.openDigit ??
                  b.closeDigit ??
                  b.openPanna ??
                  b.closePanna ??
                  "");

            const text = `
              ${bet.userId?.username || ""}
              ${bet.gameName || ""}
              ${numberValue}
            `.toLowerCase();

            if (!text.includes(search)) return;
          }

          /* ===== MARKET MAP ===== */
          const marketMap = {
            MAIN_GAME: "Main Market",
            STARLINE: "Starline",
            JACKPOT: "Jackpot",
          };

          /* ===== NUMBER FIX ===== */
          let number = "-";

          if (b.mainNo !== undefined && b.underNo) {
            number = `${b.mainNo}-${b.underNo}`;
          } else {
            number =
              b.number ??
              b.openDigit ??
              b.closeDigit ??
              b.openPanna ??
              b.closePanna ??
              "-";
          }

          allBids.push({
            _id: b._id, // ADD THIS
            playedDate: bet.playedDate || "-",
            gameType: bet.gameType || "-",

            /* MARKET COLUMN */
            mainGame: marketMap[bet.mainGame] || bet.mainGame || "-",

            /* SESSION */
            session: b.session ?? b.mode ?? "-",

            /* GAME COLUMN */
            gameName: bet.gameName || "-",

            number,
            amount,
            status: b.resultStatus || "PENDING",

            userId: bet.userId,
            createdAt: bet.createdAt,
          });
        });
      });
    }

    /* ================= SORT ================= */
    allBids.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    /* ================= PAGINATION ================= */
    const totalRecords = allBids.length;
    const totalPages = Math.ceil(totalRecords / perPage);

    const paginatedBids = allBids.slice(
      (currentPage - 1) * perPage,
      currentPage * perPage,
    );

    /* ================= RENDER (OLD STRUCTURE SAFE) ================= */
    res.render("Admin/adminBidHistory", {
      pageTitle: "Bid History",
      admin,
      games, // NOT REMOVED
      gameTypes, // NOT REMOVED
      bids: paginatedBids,
      totalRecords,
      totalPages,
      currentPage,
      perPage,
      filters: req.query,
      isLoggedIn: req.session.isLoggedIn,
    });
  } catch (err) {
    console.error("ADMIN BID HISTORY ERROR:", err);
    next(err);
  }
};
