const mongoose = require("mongoose");
const { check, validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
const User = require("../model/userSchema");
const WalletTransaction = require("../model/WalletTransaction");
const UserBankDetails = require("../model/UserBankDetails");
const moment = require("moment-timezone");
const { DateTime } = require("luxon");
const Game = require("../model/Game");
const GameRate = require("../model/GameRate");
const GameResult = require("../model/GameResult");
const { isGameOpenNow } = require("../utils/gameStatus");
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
// const StarlineSingleDigitBet = require("../model/StarlineSingleDigitBet");
// const StarlineJodiDigitBet = require("../model/StarlineJodiDigitBet");
// const StarlineSinglePannaBet = require("../model/StarlineSinglePannaBet");
// const StarlineDoublePannaBet = require("../model/StarlineDoublePannaBet");
// const StarlineTriplePannaBet = require("../model/StarlineTriplePannaBet");
const starlineGameDeclareResult = require("../model/starlineGameDeclareResult");
const StarlineSingleDigitBet = require("../model/StarlineSingleDigitBet");
const StarlineSinglePannaBet = require("../model/StarlineSinglePannaBet");
const StarlineDoublePannaBet = require("../model/StarlineDoublePannaBet");
const StarlineTriplePannaBet = require("../model/StarlineTriplePannaBet");

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

    // Fetch all game rates
    const gameRates = await GameRate.find();

    // Render the game rates page
    res.render("Admin/gameRates", {
      admin,
      gameRates,
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
    // Create and save new game rate
    const newGameRate = new GameRate({
      gameType,
      betAmount,
      profitAmount,
    });
    await newGameRate.save();
    return res.redirect("/admin/GameRates");
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
    rate.isActive = !rate.isActive;
    await rate.save();
    return res.redirect("/admin/GameRates");
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
    return res.redirect("/admin/GameRates");
  } catch (err) {
    console.error(err);
    return res.redirect("/admin/dashboard");
  }
};

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

    // 🇮🇳 Today date (India)
    const now = new Date().toLocaleString("en-US", {
      timeZone: "Asia/Kolkata",
    });
    const todayDate = new Date(now).toISOString().split("T")[0];

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

      if (r.session === "OPEN") {
        groupedResults[r.gameName].open = r;
      }

      if (r.session === "CLOSE") {
        groupedResults[r.gameName].close = r;
      }
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
            item.winAmount = item.amount * 2;
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
            item.winAmount = item.amount * 2;
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
            item.winAmount = item.amount * 2;
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
            item.winAmount = item.amount * 2;
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
            item.winAmount = item.amountPerUnderNo * 2;
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
            item.winAmount = item.amountPerUnderNo * 2;
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
            item.winAmount = item.amount * 2;
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
            item.winAmount = item.amount * 2;
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
            item.winAmount = item.amount * 2;
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
            item.winAmount = item.amount * 2;
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
            item.winAmount = item.amount * 2;
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
            item.winAmount = item.amount * 2;
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
            item.winAmount = item.amount * 2;
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
            item.winAmount = item.amountPerUnderNo * 2;
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
            item.winAmount = item.amountPerUnderNo * 2;
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
            item.winAmount = item.amountPerUnderNo * 2;
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
            item.winAmount = item.amountPerUnderNo * 2;
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
            item.winAmount = item.amountPerUnderNo * 2;
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
            item.winAmount = item.amountPerUnderNo * 2;

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
            item.winAmount = item.amountPerUnderNo * 2;
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
            item.winAmount = item.amountPerUnderNo * 2;
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
            item.winAmount = item.amountPerUnderNo * 2;
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
            item.winAmount = item.amountPerUnderNo * 2;
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
            item.winAmount = item.amountPerUnderNo * 2;
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
            item.winAmount = item.amountPerUnderNo * 2;
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
            item.winAmount = item.totalAmount * 2; // ✅ ADD THIS
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
            item.winAmount = item.totalAmount * 2;

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

    // 🇮🇳 Today date (India)
    const now = new Date().toLocaleString("en-US", {
      timeZone: "Asia/Kolkata",
    });
    const todayDate = new Date(now).toISOString().split("T")[0];

    // fetch today's results
    const results = await JackpotGameResult.find({
      resultDate: todayDate,
    }).sort({ createdAt: 1 });

    // 🔥 GROUP BY gameName
    // 🔥 GROUP BY gameName WITH RESULTS
    const groupedResults = {};

    results.forEach((r) => {
      if (!groupedResults[r.gameName]) {
        groupedResults[r.gameName] = {
          gameName: r.gameName,
          resultDate: r.resultDate,
          results: [], // 👈 line by line store here
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
            item.winAmount = item.amount * 9;
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
            item.winAmount = item.amount * 9; // ✅ Save individual win
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
            item.winAmount = item.amount * 90; // ✅ Save individual win
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

    // 🇮🇳 Today date (India)
    const now = new Date().toLocaleString("en-US", {
      timeZone: "Asia/Kolkata",
    });
    const todayDate = new Date(now).toISOString().split("T")[0];

    // fetch today's results
    const results = await starlineGameDeclareResult
      .find({
        resultDate: todayDate,
      })
      .sort({ createdAt: 1 });

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

      if (r.session === "OPEN") {
        groupedResults[r.gameName].open = r;
      }

      if (r.session === "CLOSE") {
        groupedResults[r.gameName].close = r;
      }
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
            item.winAmount = item.amount * 2;
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
            item.winAmount = item.amount * 2;
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
            item.winAmount = item.amount * 2;
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
            item.winAmount = item.amount * 2;
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
            item.winAmount = item.amount * 2;
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
            item.winAmount = item.amount * 2;
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
            item.winAmount = item.amount * 2;
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
            item.winAmount = item.amount * 2;
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

//show preview winner list
// exports.showPreviewWinnerList = async (req, res) => {
//   try {
//     if (
//       !req.session.isLoggedIn ||
//       !req.session.admin ||
//       req.session.admin.role !== "admin"
//     ) {
//       return res.redirect("/admin/login");
//     }

//     const admin = await User.findOne({
//       _id: req.session.admin._id,
//       role: "admin",
//       userStatus: "active",
//     });

//     if (!admin) {
//       req.session.destroy();
//       return res.redirect("/admin/login");
//     }

//     /* ================= REQUEST DATA ================= */
//     const { gameName, session, panna, digit, resultDate } = req.body;

//     if (!gameName || !session || !panna || !digit || !resultDate) {
//       return res
//         .status(400)
//         .json({ success: false, message: "Missing required fields" });
//     }

//     // --------- PARSE DATE IN IST ----------
//     const ist = DateTime.fromISO(resultDate, { zone: "Asia/Kolkata" });
//     const formattedDate = ist.toFormat("yyyy-MM-dd");
//     const formattedTime = ist.toFormat("HH:mm");
//     const weekday = ist.toFormat("cccc");

//     // --------- CREATE IST-SAFE Date object for createdAt ----------
//     const createdAtIST = new Date(
//       ist.year,
//       ist.month - 1, // JS months are 0-indexed
//       ist.day,
//       ist.hour,
//       ist.minute,
//       ist.second,
//       ist.millisecond,
//     );

//     /* ================= FETCH SINGLE DIGIT GAMES ================= */

//     const commonQuery = {
//       gameName: gameName,
//       playedDate: formattedDate,
//       bets: {
//         $elemMatch: {
//           number: Number(digit),
//           mode: session,
//           resultStatus: "PENDING",
//         },
//       },
//     };

//     const oddevenQuery = {
//       gameName: gameName,
//       playedDate: formattedDate,
//       bets: {
//         $elemMatch: {
//           underNo: digit, // exact match
//           mode: session,
//           resultStatus: "PENDING",
//         },
//       },
//     };

//     const [singleDigitData, singleBulkData] = await Promise.all([
//       SingleDigitBet.find(commonQuery, {
//         gameName: gameName,
//         bets: {
//           $elemMatch: {
//             number: Number(digit),
//             mode: session,
//             resultStatus: "PENDING",
//           },
//         },
//       })
//         .populate("userId")
//         .lean(),

//       SingleBulkDigitBet.find(commonQuery, {
//         gameName: gameName,
//         bets: {
//           $elemMatch: {
//             number: Number(digit),
//             mode: session,
//             resultStatus: "PENDING",
//           },
//         },
//       })
//         .populate("userId")
//         .lean(),

//       OddEvenBet.find(oddevenQuery, {
//         gameName: gameName,
//         bets: {
//           $elemMatch: {
//             underNo: digit,
//             mode: session,
//             resultStatus: "PENDING",
//           },
//         },
//       })
//         .populate("userId")
//         .lean(),
//     ]);

//     /* ================= JODI DATA (ONLY IF CLOSE) ================= */

//     let jodiDigitData = [];
//     let jodiBulkDigitData = [];
//     let redBracketData = [];

//     if (session === "CLOSE") {
//       const jodiQuery = {
//         gameName: gameName,
//         playedDate: formattedDate,
//         bets: {
//           $elemMatch: {
//             openMatched: true,
//             resultStatus: "PENDING",
//             underNo: {
//               $regex: `${digit}$`, // last digit match
//             },
//           },
//         },
//       };

//       [jodiDigitData, jodiBulkDigitData, redBracketData] = await Promise.all([
//         JodiDigitBet.find(jodiQuery).populate("userId").lean(),

//         JodiDigitBulkBet.find(jodiQuery).populate("userId").lean(),

//         RedBracketBet.find(jodiQuery).populate("userId").lean(),
//       ]);
//     }

//     /* ================= PANNA BET (digit ignored, panna match only) ================= */

//     const pannaQuery = {
//       gameName: gameName,
//       playedDate: formattedDate,
//       bets: {
//         $elemMatch: {
//           underNo: panna, // exact match, 3 digit
//           mode: session,
//           resultStatus: "PENDING",
//         },
//       },
//     };

//     const triplepannaQuery = {
//       gameName: gameName,
//       playedDate: formattedDate,
//       bets: {
//         $elemMatch: {
//           number: panna, // exact match, 3 digit
//           mode: session,
//           resultStatus: "PENDING",
//         },
//       },
//     };

//     const spanddppannaQuery = {
//       gameName: gameName,
//       playedDate: formattedDate,
//       bets: {
//         $elemMatch: {
//           underNo: panna, // exact match, 3 digit
//           session: session,
//           resultStatus: "PENDING",
//         },
//       },
//     };

//     const [
//       singlePannaData,
//       singlePannaBulkData,
//       doublePannaData,
//       doublePannaBulkData,
//       triplePannaData,
//       spMotorData,
//       dpMotorData,
//       spdptpData,
//     ] = await Promise.all([
//       SinglePannaBet.find(pannaQuery, {
//         gameName: gameName,
//         bets: {
//           $elemMatch: {
//             underNo: panna,
//             mode: session,
//             resultStatus: "PENDING",
//           },
//         },
//       })
//         .populate("userId")
//         .lean(),
//       SinglePannaBulkBet.find(pannaQuery, {
//         gameName: gameName,
//         bets: {
//           $elemMatch: {
//             underNo: panna,
//             mode: session,
//             resultStatus: "PENDING",
//           },
//         },
//       })
//         .populate("userId")
//         .lean(),
//       DoublePannaBet.find(pannaQuery, {
//         gameName: gameName,
//         bets: {
//           $elemMatch: {
//             underNo: panna,
//             mode: session,
//             resultStatus: "PENDING",
//           },
//         },
//       })
//         .populate("userId")
//         .lean(),
//       DoublePannaBulkBet.find(pannaQuery, {
//         gameName: gameName,
//         bets: {
//           $elemMatch: {
//             underNo: panna,
//             mode: session,
//             resultStatus: "PENDING",
//           },
//         },
//       })
//         .populate("userId")
//         .lean(),


//       TriplePannaBet.find(triplepannaQuery, {
//         gameName: gameName,
//         bets: {
//           $elemMatch: {
//             number: panna,
//             mode: session,
//             resultStatus: "PENDING",
//           },
//         },
//       })
//         .populate("userId")
//         .lean(),


//       SPMotorBet.find(spanddppannaQuery, {
//         gameName: gameName,
//         bets: {
//           $elemMatch: {
//             underNo: panna,
//             session: session,
//             resultStatus: "PENDING",
//           },
//         },
//       })
//         .populate("userId")
//         .lean(),
//       DPMotorBet.find(spanddppannaQuery, {
//         gameName: gameName,
//         bets: {
//           $elemMatch: {
//             underNo: panna,
//             session: session,
//             resultStatus: "PENDING",
//           },
//         },
//       })
//         .populate("userId")
//         .lean(),
//       spdptpBet.find(spanddppannaQuery, {
//         gameName: gameName,
//         bets: {
//           $elemMatch: {
//             underNo: panna,
//             session: session,
//             resultStatus: "PENDING",
//           },
//         },
//       })
//         .populate("userId")
//         .lean(),
//     ]);



//     // Half Sangam
//     let halfSangamData = [];

//     if (session === "CLOSE") {
//       const halfSangamQuery = {
//         gameName: gameName,
//         playedDate: formattedDate,
//         bets: {
//           $elemMatch: {
//             openMatched: true, // open phase already matched
//             closeDigit: Number(digit), // close digit match
//             resultStatus: "PENDING", // only pending
//           },
//         },
//       };

//       halfSangamData = await HalfSangamBet.find(halfSangamQuery)
//         .populate("userId")
//         .lean();
//     }

//     // Full Sanagam
//     let fullSangamData = [];

//     if (session === "CLOSE") {
//       const fullSangamQuery = {
//         gameName: gameName,
//         playedDate: formattedDate,
//         bets: {
//           $elemMatch: {
//             openMatched: true, // open phase already matched
//             closePanna: panna, // close panna match
//             resultStatus: "PENDING", // only pending bets
//           },
//         },
//       };

//       fullSangamData = await FullSangamBet.find(fullSangamQuery)
//         .populate("userId")
//         .lean();
//     }

//     /* ================= MERGE ALL DATA ================= */

//     const finalData = [
//       ...singleDigitData,
//       ...singleBulkData,
//       ...jodiDigitData,
//       ...jodiBulkDigitData,
//       ...singlePannaData,
//       ...singlePannaBulkData,
//       ...doublePannaData,
//       ...doublePannaBulkData,
//       ...triplePannaData,
//       ...halfSangamData,
//       ...fullSangamData,
//       ...spMotorData,
//       ...dpMotorData,
//       ...spdptpData,
//       ...redBracketData,
//     ];

//     return res.status(200).json({
//       success: true,
//       count: finalData.length,
//       data: finalData,
//     });
//   } catch (error) {
//     console.error("Error fetching matching bets:", error);
//     return res.status(500).json({
//       success: false,
//       message: "Server error",
//     });
//   }
// };



exports.showPreviewWinnerList = async (req, res) => {
  try {

    const { gameName, session, panna, digit, resultDate } = req.body;

    if (!gameName || !session || !panna || !digit || !resultDate) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields"
      });
    }

    const ist = DateTime.fromISO(resultDate, { zone: "Asia/Kolkata" });
    const formattedDate = ist.toFormat("yyyy-MM-dd");

    /* =====================================================
       HELPER FUNCTION → QUERY + PROJECTION SAME RAKHEGA
    ====================================================== */

    const findWithElemMatch = async (Model, elemMatch) => {
      return await Model.find(
        {
          gameName,
          playedDate: formattedDate,
          bets: { $elemMatch: elemMatch }
        },
        {
          gameName: 1,
          gameType: 1,
          userId: 1,
          bets: { $elemMatch: elemMatch }
        }
      )
        .populate("userId")
        .lean();
    };

    /* =====================================================
       1️⃣ SINGLE DIGIT TYPE
    ====================================================== */

    const singleDigitMatch = {
      number: Number(digit),
      mode: session,
      resultStatus: "PENDING"
    };

    const oddEvenMatch = {
      underNo: digit,
      mode: session,
      resultStatus: "PENDING"
    };

    const [
      singleDigitData,
      singleBulkData,
      oddEvenData
    ] = await Promise.all([
      findWithElemMatch(SingleDigitBet, singleDigitMatch),
      findWithElemMatch(SingleBulkDigitBet, singleDigitMatch),
      findWithElemMatch(OddEvenBet, oddEvenMatch)
    ]);

    /* =====================================================
       2️⃣ PANNA TYPES
    ====================================================== */

    const pannaMatch = {
      underNo: panna,
      mode: session,
      resultStatus: "PENDING"
    };

    const tripleMatch = {
      number: panna,
      mode: session,
      resultStatus: "PENDING"
    };

    const [
      singlePannaData,
      singlePannaBulkData,
      doublePannaData,
      doublePannaBulkData,
      triplePannaData
    ] = await Promise.all([
      findWithElemMatch(SinglePannaBet, pannaMatch),
      findWithElemMatch(SinglePannaBulkBet, pannaMatch),
      findWithElemMatch(DoublePannaBet, pannaMatch),
      findWithElemMatch(DoublePannaBulkBet, pannaMatch),
      findWithElemMatch(TriplePannaBet, tripleMatch)
    ]);

    /* =====================================================
       3️⃣ CLOSE SESSION SPECIAL GAMES
    ====================================================== */

    let jodiData = [];
    let redBracketData = [];
    let halfSangamData = [];
    let fullSangamData = [];

    if (session === "CLOSE") {

      const jodiMatch = {
        openMatched: true,
        resultStatus: "PENDING",
        underNo: { $regex: `${digit}$` }
      };

      const halfSangamMatch = {
        openMatched: true,
        closeDigit: Number(digit),
        resultStatus: "PENDING"
      };

      const fullSangamMatch = {
        openMatched: true,
        closePanna: panna,
        resultStatus: "PENDING"
      };

      [
        jodiData,
        redBracketData,
        halfSangamData,
        fullSangamData
      ] = await Promise.all([
        findWithElemMatch(JodiDigitBet, jodiMatch),
        findWithElemMatch(RedBracketBet, jodiMatch),
        findWithElemMatch(HalfSangamBet, halfSangamMatch),
        findWithElemMatch(FullSangamBet, fullSangamMatch)
      ]);
    }

    /* =====================================================
       MERGE ALL
    ====================================================== */

    const finalData = [
      ...singleDigitData,
      ...singleBulkData,
      ...oddEvenData,
      ...singlePannaData,
      ...singlePannaBulkData,
      ...doublePannaData,
      ...doublePannaBulkData,
      ...triplePannaData,
      ...jodiData,
      ...redBracketData,
      ...halfSangamData,
      ...fullSangamData
    ];

    return res.status(200).json({
      success: true,
      count: finalData.length,
      data: finalData
    });

  } catch (error) {
    console.error("Preview Winner Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

// end show preview winner list

// Extra first check minum load of check preview winner users

// exports.showPreviewWinnerList = async (req, res) => {
//   try {
//     // -------- AUTH CHECK --------
//     if (!req.session.isLoggedIn || !req.session.admin || req.session.admin.role !== 'admin') {
//       return res.redirect('/admin/login');
//     }

//     const admin = await User.findOne({ _id: req.session.admin._id, role: 'admin', userStatus: 'active' });
//     if (!admin) {
//       req.session.destroy();
//       return res.redirect('/admin/login');
//     }

//     // -------- REQUEST DATA --------
//     const { gameName, session, panna, digit, resultDate } = req.body;
//     if (!gameName || !session || !panna || !digit || !resultDate) {
//       return res.status(400).json({ success: false, message: 'Missing required fields' });
//     }

//     const ist = DateTime.fromISO(resultDate, { zone: 'Asia/Kolkata' });
//     const formattedDate = ist.toFormat('yyyy-MM-dd');

//     // -------- HELPER FUNCTIONS --------
//     const makeQuery = (field, value, extra = {}) => ({
//       gameName,
//       playedDate: formattedDate,
//       bets: { $elemMatch: { [field]: value, ...extra } },
//     });

// const normalizeBets = (item) => {
//   const bets = item.bets.map(bet => ({
//     ...bet,
//     underNo: bet.underNo ?? bet.number ?? null,
//     number: bet.number ?? bet.underNo ?? null,
//     amountPerUnderNo: bet.amountPerUnderNo ?? bet.amount ?? 0,
//     amount: bet.amount ?? bet.amountPerUnderNo ?? 0,
//     mainGame: bet.mainGame ?? '',
// mode: bet.mode ?? '',
// session: bet.session ?? '',

//   }));
//   return { ...item, bets };
// };

//     // -------- QUERIES --------
//     const queries = {
//       singleDigit: makeQuery('number', Number(digit), { mode: session, resultStatus: 'PENDING' }),
//       oddEven: makeQuery('underNo', digit, { mode: session, resultStatus: 'PENDING' }),
//       panna: makeQuery('underNo', panna, { mode: session, resultStatus: 'PENDING' }),
//       triplePanna: makeQuery('number', panna, { mode: session, resultStatus: 'PENDING' }),
//       spdp: makeQuery('underNo', panna, { session: session, resultStatus: 'PENDING' }),
//     };

//     if (session === 'CLOSE') {
//       queries.jodi = makeQuery('underNo', { $regex: `${digit}$` }, { openMatched: true, resultStatus: 'PENDING' });
//       queries.halfSangam = makeQuery('closeDigit', Number(digit), { openMatched: true, resultStatus: 'PENDING' });
//       queries.fullSangam = makeQuery('closePanna', panna, { openMatched: true, resultStatus: 'PENDING' });
//     }

//     // -------- COLLECTION FETCHES --------
//     const collections = [
//       { model: SingleDigitBet, query: queries.singleDigit },
//       { model: SingleBulkDigitBet, query: queries.singleDigit },
//       { model: OddEvenBet, query: queries.oddEven },
//       { model: SinglePannaBet, query: queries.panna },
//       { model: SinglePannaBulkBet, query: queries.panna },
//       { model: DoublePannaBet, query: queries.panna },
//       { model: DoublePannaBulkBet, query: queries.panna },
//       { model: TriplePannaBet, query: queries.triplePanna },
//       { model: SPMotorBet, query: queries.spdp },
//       { model: DPMotorBet, query: queries.spdp },
//       { model: spdptpBet, query: queries.spdp },
//     ];

//     if (session === 'CLOSE') {
//       collections.push(
//         { model: JodiDigitBet, query: queries.jodi },
//         { model: JodiDigitBulkBet, query: queries.jodi },
//         { model: RedBracketBet, query: queries.jodi },
//         { model: HalfSangamBet, query: queries.halfSangam },
//         { model: FullSangamBet, query: queries.fullSangam }
//       );
//     }

//     // -------- PARALLEL FETCH & NORMALIZE --------
//     const results = await Promise.all(collections.map(c => c.model.find(c.query).populate('userId').lean()));
//     const finalData = results.flat().map(normalizeBets);

//     // -------- RESPONSE --------
//     return res.status(200).json({ success: true, count: finalData.length, data: finalData });

//   } catch (error) {
//     console.error('Error fetching matching bets:', error);
//     return res.status(500).json({ success: false, message: 'Server error' });
//   }
// };

//End  Extra first check minum load of check preview winner users

// change bid amount and bid number by admin (for all games - single digit, double panna, single panna, jodi digit etc)
exports.updateBidData = async (req, res) => {
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
    const {
      gameName,
      session,
      playedDate,
      betId,
      betItemId,
      newNumber,
      newAmount,
    } = req.body;

    if (!gameName || !playedDate || !betId || !betItemId) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    /* =====================================================
       🔥 DOUBLE PANNA UPDATE
    ===================================================== */

    if (gameName === "DoublePanna") {
      const bet = await DoublePannaBet.findOne({
        _id: betId,
        playedDate,
      }).populate("userId");

      if (!bet)
        return res
          .status(404)
          .json({ success: false, message: "Bet not found" });

      const item = bet.bets.id(betItemId);

      if (!item)
        return res
          .status(404)
          .json({ success: false, message: "Bet item not found" });

      const beforeNumber = item.underNo;
      const beforeAmount = item.amount;

      if (session === item.mode) {
        item.underNo = newNumber;
        item.amount = Number(newAmount);
      }

      await bet.save();

      await AdminBetEditHistory.create({
        adminId: admin._id,
        userId: bet.userId._id,
        gameName,
        gameType: "DOUBLE PANNA",
        session,
        playedDate,
        betId,
        betItemId,
        beforeNumber,
        afterNumber: newNumber,
        beforeAmount,
        afterAmount: newAmount,
      });
    }

    /* =====================================================
       🔥 SINGLE DIGIT UPDATE
    ===================================================== */

    if (gameName === "SingleDigit") {
      const bet = await SingleDigitBet.findOne({
        _id: betId,
        playedDate,
      }).populate("userId");

      if (!bet)
        return res
          .status(404)
          .json({ success: false, message: "Bet not found" });

      const item = bet.bets.id(betItemId);

      const beforeNumber = item.number;
      const beforeAmount = item.amount;

      if (session === item.mode) {
        item.number = Number(newNumber);
        item.amount = Number(newAmount);
      }

      await bet.save();

      await AdminBetEditHistory.create({
        adminId: admin._id,
        userId: bet.userId._id,
        gameName,
        gameType: "SINGLE DIGIT",
        session,
        playedDate,
        betId,
        betItemId,
        beforeNumber,
        afterNumber: newNumber,
        beforeAmount,
        afterAmount: newAmount,
      });
    }

    /* =====================================================
       🔥 SINGLE PANNA UPDATE
    ===================================================== */

    if (gameName === "SinglePanna") {
      const bet = await SinglePannaBet.findOne({
        _id: betId,
        playedDate,
      }).populate("userId");

      const item = bet.bets.id(betItemId);

      const beforeNumber = item.underNo;
      const beforeAmount = item.amount;

      if (session === item.mode) {
        item.underNo = newNumber;
        item.amount = Number(newAmount);
      }

      await bet.save();

      await AdminBetEditHistory.create({
        adminId: admin._id,
        userId: bet.userId._id,
        gameName,
        gameType: "SINGLE PANNA",
        session,
        playedDate,
        betId,
        betItemId,
        beforeNumber,
        afterNumber: newNumber,
        beforeAmount,
        afterAmount: newAmount,
      });
    }

    /* =====================================================
       🔥 JODI DIGIT UPDATE
    ===================================================== */

    if (gameName === "JodiDigit") {
      const bet = await JodiDigitBet.findOne({
        _id: betId,
        playedDate,
      }).populate("userId");

      const item = bet.bets.id(betItemId);

      const beforeNumber = item.underNo;
      const beforeAmount = item.amount;

      item.underNo = newNumber;
      item.amount = Number(newAmount);

      await bet.save();

      await AdminBetEditHistory.create({
        adminId: admin._id,
        userId: bet.userId._id,
        gameName,
        gameType: "JODI DIGIT",
        session,
        playedDate,
        betId,
        betItemId,
        beforeNumber,
        afterNumber: newNumber,
        beforeAmount,
        afterAmount: newAmount,
      });
    }

    /* =====================================================
       🔥 YOU CAN COPY SAME BLOCK FOR:
       - TriplePanna
       - OddEven
       - RedBracket
       - SP Motor
       - DP Motor
       - Half Sangam
       - Full Sangam
       - Bulk Versions
    ===================================================== */

    return res.json({
      success: true,
      message: "Bet updated successfully",
    });
  } catch (err) {
    console.error("Update Bet Error:", err);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
