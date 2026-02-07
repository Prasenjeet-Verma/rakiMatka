const { check, validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
const User = require("../model/userSchema");
const WalletTransaction = require("../model/WalletTransaction");
const UserBankDetails = require("../model/UserBankDetails");
const moment = require("moment-timezone");
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
const mongoose = require("mongoose");

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

    const totalGames = await Game.countDocuments({ isDeleted: false });
    const totalPages = Math.ceil(totalGames / limit);

    const games = await Game.find({ isDeleted: false })
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

exports.getPendingGames = async (req, res) => {
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

    let gameSet = new Set();

    for (const BetModel of betModels) {
      const games = await BetModel.find(
        {
          bets: { $elemMatch: { resultStatus: "PENDING" } },
        },
        { gameName: 1, _id: 0 },
      );

      games.forEach((g) => {
        if (g.gameName) gameSet.add(g.gameName);
      });
    }

    res.json({
      success: true,
      games: [...gameSet],
    });
  } catch (err) {
    console.error("Pending game fetch error:", err);
    res.status(500).json({ success: false });
  }
};

const { DateTime } = require("luxon");
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
    const { gameName, session, panna, digit } = req.body;

    if (!gameName || !session || !panna || !digit) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    /* ================= IST TIME ================= */
    const ist = DateTime.now().setZone("Asia/Kolkata");
    const todayDate = ist.toFormat("yyyy-MM-dd");

    /* ================= SAVE RESULT ================= */
    await GameResult.create({
      gameName,
      session,
      panna,
      digit,
      resultDate: todayDate,
      resultTime: ist.toFormat("HH:mm"),
      resultWeekday: ist.toFormat("cccc"),
      createdAt: ist.toJSDate(),
    });

    /* =====================================================
    🔥 DOUBLE PANNA SAFE SETTLEMENT (OPEN → CLOSE)
 ===================================================== */

    const bets = await DoublePannaBet.find({
      gameName,
      playedDate: todayDate,
      "bets.resultStatus": "PENDING",
    }).populate("userId");

    for (const bet of bets) {
      let totalWinAmount = 0;

      bet.bets.forEach((item) => {
        if (item.resultStatus !== "PENDING") return;

        /* ================= 🟡 OPEN SESSION ================= */
        if (session === "OPEN") {
          if (item.mode !== "OPEN") return;

          if (item.underNo === panna) {
            item.openMatched = true; // ✅ yaad rakh liya
          }
          return; // ❗ OPEN pe result finalize nahi
        }

        /* ================= 🔴 CLOSE SESSION ================= */
        if (session === "CLOSE") {
          let itemWin = 0;

          // OPEN win mila tha?
          if (item.mode === "OPEN" && item.openMatched) {
            itemWin += item.amount * 2;
          }

          // CLOSE win mila?
          if (item.mode === "CLOSE" && item.underNo === panna) {
            itemWin += item.amount * 2;
          }

          if (itemWin > 0) {
            item.resultStatus = "WIN";
            item.winAmount = itemWin;
            totalWinAmount += itemWin;
          } else {
            item.resultStatus = "LOSS";
          }
        }
      });

      /* ================= 💰 WALLET UPDATE (ONLY CLOSE) ================= */
      if (session === "CLOSE" && totalWinAmount > 0) {
        bet.userId.wallet += totalWinAmount;
        await bet.userId.save();

        bet.afterWallet = bet.userId.wallet;
        bet.winningPanna = panna;
      }

      await bet.save();
    }

    /* =====================================================
       🔥 SINGLE PANNA RESULT SETTLEMENT (OPEN / CLOSE SAFE)
    ===================================================== */

    const singlePannaBets = await SinglePannaBet.find({
      gameName,
      playedDate: todayDate,
      "bets.resultStatus": "PENDING",
    }).populate("userId");

    for (const bet of singlePannaBets) {
      let totalWinAmount = 0;
      let isAnyWin = false;

      bet.bets.forEach((item) => {
        if (item.resultStatus !== "PENDING") return;

        /* ================= 🟡 OPEN SESSION ================= */
        if (session === "OPEN") {
          if (item.mode === "OPEN" && item.underNo === panna) {
            item.openMatched = true; // 🔥 OPEN panna matched
          }
          return; // ❗ OPEN pe koi WIN / LOSS nahi
        }

        /* ================= 🔴 CLOSE SESSION (FINAL) ================= */
        if (session === "CLOSE") {
          const closeMatched = item.mode === "CLOSE" && item.underNo === panna;

          if (item.openMatched || closeMatched) {
            // ✅ WIN
            item.resultStatus = "WIN";
            item.winAmount = item.amount * 2;

            totalWinAmount += item.winAmount;
            isAnyWin = true;
          } else {
            // ❌ LOSS
            item.resultStatus = "LOSS";
            item.winAmount = 0;
          }
        }
      });

      /* ================= 💰 WALLET UPDATE (ONLY CLOSE) ================= */
      if (session === "CLOSE" && isAnyWin && totalWinAmount > 0) {
        bet.userId.wallet += totalWinAmount;
        await bet.userId.save();

        bet.afterWallet = bet.userId.wallet;
        bet.winningPanna = panna;
      }

      await bet.save();
    }

    /* =====================================================
      🔥 SINGLE BULK DIGIT RESULT SETTLEMENT (OPEN / CLOSE)
   ===================================================== */

    const singleBulkDigitBets = await SingleBulkDigitBet.find({
      gameName,
      playedDate: todayDate,
      "bets.resultStatus": "PENDING",
    }).populate("userId");

    for (const bet of singleBulkDigitBets) {
      let totalWinAmount = 0;
      let isAnyWin = false;

      bet.bets.forEach((item) => {
        if (item.resultStatus !== "PENDING") return;

        /* ================= 🟡 OPEN SESSION ================= */
        if (session === "OPEN") {
          if (item.mode === "OPEN" && item.number === Number(digit)) {
            item.openMatched = true; // 🔥 remember OPEN win
          }
          return; // ❗ no WIN / LOSS on OPEN
        }

        /* ================= 🔴 CLOSE SESSION (FINAL) ================= */
        if (session === "CLOSE") {
          const closeMatched =
            item.mode === "CLOSE" && item.number === Number(digit);

          if (item.openMatched || closeMatched) {
            // ✅ WIN
            item.resultStatus = "WIN";
            item.winAmount = item.amount * 2;

            totalWinAmount += item.winAmount;
            isAnyWin = true;
          } else {
            // ❌ LOSS
            item.resultStatus = "LOSS";
            item.winAmount = 0;
          }
        }
      });

      /* ================= 💰 WALLET UPDATE (ONLY CLOSE) ================= */
      if (session === "CLOSE" && isAnyWin && totalWinAmount > 0) {
        bet.userId.wallet += totalWinAmount;
        await bet.userId.save();

        bet.afterWallet = bet.userId.wallet;
        bet.winningNumber = Number(digit);
      }

      await bet.save();
    }

    /* =====================================================
       🔥 SINGLE DIGIT RESULT SETTLEMENT (OPEN / CLOSE SAFE)
    ===================================================== */

    const singleDigitBets = await SingleDigitBet.find({
      gameName,
      playedDate: todayDate,
      "bets.resultStatus": "PENDING",
    }).populate("userId");

    for (const bet of singleDigitBets) {
      let totalWinAmount = 0;
      let isAnyWin = false;

      bet.bets.forEach((item) => {
        if (item.resultStatus !== "PENDING") return;

        /* ================= 🟡 OPEN SESSION ================= */
        if (session === "OPEN") {
          if (item.mode === "OPEN" && item.number === Number(digit)) {
            item.openMatched = true; // 🔥 remember OPEN win
          }
          return; // ❗ OPEN pe koi WIN / LOSS nahi
        }

        /* ================= 🔴 CLOSE SESSION (FINAL) ================= */
        if (session === "CLOSE") {
          const closeMatched =
            item.mode === "CLOSE" && item.number === Number(digit);

          if (item.openMatched || closeMatched) {
            // ✅ WIN
            item.resultStatus = "WIN";
            item.winAmount = item.amount * 2;

            totalWinAmount += item.winAmount;
            isAnyWin = true;
          } else {
            // ❌ LOSS
            item.resultStatus = "LOSS";
            item.winAmount = 0;
          }
        }
      });

      /* ================= 💰 WALLET UPDATE (ONLY CLOSE) ================= */
      if (session === "CLOSE" && isAnyWin && totalWinAmount > 0) {
        bet.userId.wallet += totalWinAmount;
        await bet.userId.save();

        bet.afterWallet = bet.userId.wallet;
        bet.winningNumber = Number(digit);
      }

      await bet.save();
    }

    /* =====================================================
    🔥 TRIPLE PANNA RESULT SETTLEMENT (OPEN / CLOSE SAFE)
 ===================================================== */

    const triplePannaBets = await TriplePannaBet.find({
      gameName,
      playedDate: todayDate,
      "bets.resultStatus": "PENDING",
    }).populate("userId");

    for (const bet of triplePannaBets) {
      let totalWinAmount = 0;
      let isAnyWin = false;

      bet.bets.forEach((item) => {
        if (item.resultStatus !== "PENDING") return;

        /* ================= 🟡 OPEN SESSION ================= */
        if (session === "OPEN") {
          if (item.mode === "OPEN" && item.number === panna) {
            item.openMatched = true; // 🔥 OPEN panna matched
          }
          return; // ❗ OPEN pe koi WIN / LOSS nahi
        }

        /* ================= 🔴 CLOSE SESSION (FINAL) ================= */
        if (session === "CLOSE") {
          const closeMatched = item.mode === "CLOSE" && item.number === panna;

          if (item.openMatched || closeMatched) {
            // ✅ WIN
            item.resultStatus = "WIN";
            item.winAmount = item.amount * 2;

            totalWinAmount += item.winAmount;
            isAnyWin = true;
          } else {
            // ❌ LOSS
            item.resultStatus = "LOSS";
            item.winAmount = 0;
          }
        }
      });

      /* ================= 💰 WALLET UPDATE (ONLY CLOSE) ================= */
      if (session === "CLOSE" && isAnyWin && totalWinAmount > 0) {
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
      playedDate: todayDate,
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
       🔥 DOUBLE PANNA BULK RESULT SETTLEMENT (TODAY ONLY)
    ===================================================== */

    const doublePannaBulkBets = await DoublePannaBulkBet.find({
      gameName,
      playedDate: todayDate,
      "bets.resultStatus": "PENDING",
    }).populate("userId");

    for (const bet of doublePannaBulkBets) {
      let totalWinAmount = 0;

      bet.bets.forEach((item) => {
        if (item.resultStatus !== "PENDING") return;

        /* 🟡 OPEN SESSION */
        if (session === "OPEN") {
          if (item.mode === "OPEN" && item.underNo === panna) {
            item.openMatched = true; // 🔥 remember OPEN win
          }
          return; // ❗ no LOSS / no WIN on OPEN
        }

        /* 🔴 CLOSE SESSION (FINAL) */
        if (session === "CLOSE") {
          const closeMatched = item.mode === "CLOSE" && item.underNo === panna;

          if (item.openMatched || closeMatched) {
            item.resultStatus = "WIN";
            item.winAmount = item.amountPerUnderNo * 2;
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
        bet.winningPanna = panna;
      }

      await bet.save();
    }

/* =====================================================
   🔥 JODI DIGIT BULK RESULT SETTLEMENT (TODAY ONLY)
===================================================== */

const jodiDigitBulkBets = await JodiDigitBulkBet.find({
  gameName,
  playedDate: todayDate,
  "bets.resultStatus": "PENDING",
}).populate("userId");

for (const bet of jodiDigitBulkBets) {
  let totalWinAmount = 0;

  bet.bets.forEach((item) => {
    if (item.resultStatus !== "PENDING") return;

    const firstDigit = item.underNo[0];  // OPEN digit
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
};


    /* =====================================================
       🔥 SINGLE PANNA BULK RESULT SETTLEMENT (TODAY ONLY)
    ===================================================== */

    const singlePannaBulkBets = await SinglePannaBulkBet.find({
      gameName,
      playedDate: todayDate,
      "bets.resultStatus": "PENDING",
    }).populate("userId");

    for (const bet of singlePannaBulkBets) {
      let totalWinAmount = 0;

      bet.bets.forEach((item) => {
        if (item.resultStatus !== "PENDING") return;

        /* 🟡 OPEN SESSION */
        if (session === "OPEN") {
          if (item.mode === "OPEN" && item.underNo === panna) {
            item.openMatched = true; // 🔥 remember open win
          }
          return; // no win/loss on OPEN
        }

        /* 🔴 CLOSE SESSION (FINAL) */
        if (session === "CLOSE") {
          const closeMatched = item.mode === "CLOSE" && item.underNo === panna;

          if (item.openMatched || closeMatched) {
            item.resultStatus = "WIN";
            item.winAmount = item.amountPerUnderNo * 2;
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
      }

      await bet.save();
    }

    /* =====================================================
       🔥 ODD EVEN RESULT SETTLEMENT (OPEN / CLOSE SAFE)
    ===================================================== */

    const oddEvenBets = await OddEvenBet.find({
      gameName,
      playedDate: todayDate,
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

        /* 🟡 OPEN SESSION */
        if (session === "OPEN") {
          if (
            item.mode === "OPEN" &&
            item.underNo === digit &&
            patternMatched
          ) {
            item.openMatched = true; // 🔥 remember open match
          }
          return; // no win/loss on OPEN
        }

        /* 🔴 CLOSE SESSION (FINAL) */
        if (session === "CLOSE") {
          const closeMatched =
            item.mode === "CLOSE" && item.underNo === digit && patternMatched;

          if (item.openMatched || closeMatched) {
            item.resultStatus = "WIN";
            item.winAmount = item.amountPerUnderNo * 2;
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
      }

      await bet.save();
    }

    /* =====================================================
   🔥 RED BRACKET RESULT SETTLEMENT (OPEN + CLOSE BOTH)
===================================================== */

    const redBracketBets = await RedBracketBet.find({
      gameName,
      playedDate: todayDate,
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
   🔥 SP MOTOR RESULT SETTLEMENT (FINAL & CORRECT)
===================================================== */

    const spMotorBets = await SPMotorBet.find({
      gameName,
      playedDate: todayDate,
      "bets.resultStatus": "PENDING",
    }).populate("userId");

    for (const bet of spMotorBets) {
      let totalWinAmount = 0;

      bet.bets.forEach((item) => {
        if (item.resultStatus !== "PENDING") return;

        /* ================= OPEN SESSION ================= */
        if (session === "OPEN") {
          if (item.session === "OPEN" && item.underNo === panna) {
            item.openMatched = true; // 🔥 remember open win
          }
          return; // ❗ NO result decision in OPEN
        }

        /* ================= CLOSE SESSION (FINAL) ================= */
        if (session === "CLOSE") {
          const closeMatched =
            item.session === "CLOSE" && item.underNo === panna;

          /*
        FINAL LOGIC
        openMatched  OR  closeMatched  => WIN
      */
          if (item.openMatched || closeMatched) {
            item.resultStatus = "WIN";

            // payout (change multiplier if needed)
            item.winAmount = item.amountPerUnderNo * 2;
            totalWinAmount += item.winAmount;
          } else {
            item.resultStatus = "LOSS";
          }
        }
      });

      /* ================= WALLET UPDATE (ONLY ON CLOSE) ================= */
      if (session === "CLOSE" && totalWinAmount > 0) {
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
      playedDate: todayDate,
      "bets.resultStatus": "PENDING",
    }).populate("userId");

    for (const bet of fullSangamBets) {
      let totalWinAmount = 0;

      bet.bets.forEach((item) => {
        if (item.resultStatus !== "PENDING") return;

        /* 🟡 OPEN RESULT */
        if (session === "OPEN") {
          if (item.openPanna === Number(panna)) {
            item.openMatched = true; // ✅ stored in DB
          }
          return;
        }

        /* 🔴 CLOSE RESULT (FINAL) */
        if (session === "CLOSE") {
          if (item.openMatched === true || item.closePanna === Number(panna)) {
            item.resultStatus = "WIN";
            totalWinAmount += item.totalAmount * 2;
          } else {
            item.resultStatus = "LOSS";
          }
        }
      });

      /* 💰 WALLET UPDATE (ONLY ON CLOSE) */
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
      playedDate: todayDate,
      "bets.resultStatus": "PENDING",
    }).populate("userId");

    for (const bet of halfSangamBets) {
      let totalWinAmount = 0;

      bet.bets.forEach((item) => {
        if (item.resultStatus !== "PENDING") return;

        /* 🟡 OPEN RESULT */
        if (session === "OPEN") {
          if (item.openPanna === Number(panna)) {
            item.openMatched = true; // ✅ store OPEN match
          }
          return; // OPEN pe yahin stop
        }

        /* 🔴 CLOSE RESULT (FINAL) */
        if (session === "CLOSE") {
          if (item.openMatched === true || item.closeDigit === Number(digit)) {
            // ✅ WIN
            item.resultStatus = "WIN";
            totalWinAmount += item.totalAmount * 2;
          } else {
            // ❌ LOSS
            item.resultStatus = "LOSS";
          }
        }
      });

      /* 💰 WALLET UPDATE (ONLY ON CLOSE) */
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
