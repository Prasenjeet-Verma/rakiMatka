const moment = require("moment-timezone");
const Game = require("../model/Game");
const bcrypt = require("bcryptjs");
const User = require("../model/userSchema");
const WalletTransaction = require("../model/WalletTransaction");
const UserBankDetails = require("../model/UserBankDetails");
const GameRate = require("../model/GameRate");
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
const starlineSingleDigitBet = require("../model/StarlineSingleDigitBet");
const StarlineSinglePannaBet = require("../model/StarlineSinglePannaBet");
const StarlineDoublePannaBet = require("../model/StarlineDoublePannaBet");
const StarlineTripplePannaBet = require("../model/StarlineTriplePannaBet");
const LeftDigitBet = require("../model/JackpotLeftDigitBet");
const RightDigitBet = require("../model/JackpotRightDigitBet");
const JackpotCentreJodiDigitBet = require("../model/JackpotCentreJodiDigitBet");
exports.UserHomePage = async (req, res, next) => {
  try {
    // This will be either the user object or undefined
    const user = req.session.user || null;

    // isLoggedIn will be true or false
    const isLoggedIn = !!req.session.isLoggedIn;

    // Render your home page and pass the session info
    res.render("User/UserHomePage", {
      user: user,
      isLoggedIn: false,
    });
  } catch (err) {
    console.error("Error in UserHomePage:", err);
    next(err); // pass error to Express error handler
  }
};

exports.getUserDashboardPage = async (req, res, next) => {
  try {
    // 🔐 Auth check
    if (
      !req.session.isLoggedIn ||
      !req.session.user ||
      req.session.user.role !== "user"
    ) {
      return res.redirect("/login");
    }

    const user = await User.findOne({
      _id: req.session.user._id,
      role: "user",
      userStatus: "active",
    }).select("-password");

    if (!user) {
      req.session.destroy();
      return res.redirect("/login");
    }

    const admin = await User.findOne({ role: "admin" }).select(
      "username phoneNo profilePhoto",
    );

    // 🇮🇳 Current time in India
    const now = moment().tz("Asia/Kolkata");
    const days = [
      "sunday",
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
    ];
    const todayKey = days[now.day()];

    // Fetch all active games
    const games = await Game.find({ isDeleted: false }).lean();

    // ===================== 🎯 PROCESS GAMES =====================
    const processedGames = games
      .filter((game) => {
        const d = game.schedule?.[todayKey];
        return d && d.isActive && d.closeTime;
      })
      .map((game) => {
        const d = game.schedule[todayKey];

        const nowMinutes = now.hours() * 60 + now.minutes();

        const [ch, cm] = d.closeTime.split(":").map(Number);
        const closeMinutes = ch * 60 + cm;

        // 🔥 SIMPLE & CORRECT LOGIC
        const isRunning = nowMinutes <= closeMinutes;

        return {
          _id: game._id,
          gameName: game.gameName,
          openTime: moment(d.openTime, "HH:mm").format("hh:mm A"), // admin open time (display)
          closeTime: moment(d.closeTime, "HH:mm").format("hh:mm A"),
          isRunning,
          statusText: isRunning ? "Market Running" : "Market Closed",
          isStarline: game.isStarline || false,
          isJackpot: game.isJackpot || false,
        };
      });

    // ===================== 🎯 SEPARATE GAMES =====================
    const normalGames = processedGames.filter(
      (g) => !g.isStarline && !g.isJackpot,
    );
    const starlineGames = processedGames.filter((g) => g.isStarline);
    const jackpotGames = processedGames.filter((g) => g.isJackpot);

    // ===================== 🎯 FETCH TRANSACTIONS =====================
    const transactions = await WalletTransaction.find({
      user: user._id,
      status: "success",
    })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    const formattedTransactions = transactions.map((tx) => {
      let title, displayType, amountSign, amountColor;

      if (tx.type === "credit") {
        amountSign = "+";
        amountColor = "text-green-600";
        displayType = "deposit";
        title = tx.source === "game_win" ? "Game Win" : "Deposit";
      }

      if (tx.type === "debit") {
        amountSign = "-";
        amountColor = "text-red-600";
        displayType = "withdraw";
        title = tx.source === "game_loss" ? "Game Loss" : "Withdrawal";
      }

      return {
        title,
        displayType,
        amountText: `${amountSign}${tx.amount}`,
        amountColor,
        createdAt: moment(tx.createdAt)
          .tz("Asia/Kolkata")
          .format("DD MMM YYYY hh:mm:ss A"),
      };
    });

    // ===================== 🎯 RENDER DASHBOARD =====================
    res.render("User/userDashboard", {
      user,
      admin,
      normalGames,
      starlineGames,
      jackpotGames,
      transactions: formattedTransactions,
      isLoggedIn: req.session.isLoggedIn,
    });
  } catch (err) {
    console.error("UserDashboardPage Error:", err);
    next(err);
  }
};

exports.getUserProfilePage = async (req, res, next) => {
  try {
    // 🔐 User Security Check
    if (
      !req.session.isLoggedIn ||
      !req.session.user ||
      req.session.user.role !== "user"
    ) {
      return res.redirect("/login");
    }

    const user = await User.findOne({
      _id: req.session.user._id,
      role: "user",
      userStatus: "active",
    }).select("-password");

    if (!user) {
      req.session.destroy();
      return res.redirect("/login");
    }

    // Optional: admin info (for header/support)
    const admin = await User.findOne({ role: "admin" }).select(
      "username phoneNo profilePhoto",
    );
    const oldInput = req.session.oldInput || {};
    req.session.oldInput = null; // clear after use
    const flash = req.session.flash || null;
    req.session.flash = null; // 👈 clear after use
    res.render("User/userProfile", {
      user,
      admin,
      oldInput,
      flash,
      isLoggedIn: req.session.isLoggedIn,
    });
  } catch (err) {
    console.error("userProfile Error:", err);
    next(err);
  }
};

exports.postUserEditDetails = async (req, res, next) => {
  try {
    // 🔐 User auth check
    if (
      !req.session.isLoggedIn ||
      !req.session.user ||
      req.session.user.role !== "user"
    ) {
      return res.redirect("/login");
    }

    const user = await User.findOne({
      _id: req.session.user._id,
      role: "user",
      userStatus: "active",
    });

    if (!user) {
      req.session.destroy();
      return res.redirect("/login");
    }

    const username = req.body.username?.trim();
    const phoneNo = req.body.phoneNo?.trim();

    if (username === user.username && phoneNo === user.phoneNo) {
      req.session.flash = {
        type: "info",
        message: "No changes detected",
      };
      // ✅ IMPORTANT: return + session.save
      return req.session.save(() => {
        res.redirect("/userprofile");
      });
    }

    // ❌ Basic validation
    if (!username || !phoneNo) {
      req.session.oldInput = req.body;
      req.session.flash = {
        type: "error",
        message: "Username and mobile number are required",
      };
      // ✅ IMPORTANT: return + session.save
      return req.session.save(() => {
        res.redirect("/userprofile");
      });
    }

    // ❌ Check duplicate username
    const usernameExists = await User.findOne({
      username,
      _id: { $ne: user._id },
    });

    if (usernameExists) {
      req.session.oldInput = req.body;
      req.session.flash = {
        type: "error",
        message: "Username already in use",
      };
      // ✅ IMPORTANT: return + session.save
      return req.session.save(() => {
        res.redirect("/userprofile");
      });
    }
    const phoneRegex = /^[6-9]\d{9}$/;
    if (!phoneRegex.test(phoneNo)) {
      req.session.oldInput = req.body;
      req.session.flash = {
        type: "error",
        message: "Enter a valid 10-digit mobile number",
      };
      // ✅ IMPORTANT: return + session.save
      return req.session.save(() => {
        res.redirect("/userprofile");
      });
    }

    // ❌ Check duplicate phone
    const phoneExists = await User.findOne({
      phoneNo,
      _id: { $ne: user._id },
    });

    if (phoneExists) {
      req.session.oldInput = req.body;
      req.session.flash = {
        type: "error",
        message: "Mobile number already in use",
      };
      // ✅ IMPORTANT: return + session.save
      return req.session.save(() => {
        res.redirect("/userprofile");
      });
    }

    // ✅ Update user
    user.username = username;
    user.phoneNo = phoneNo;
    await user.save();

    // 🔁 Update session data (important)
    req.session.user.username = username;
    req.session.user.phoneNo = phoneNo;

    req.session.oldInput = null;
    req.session.flash = {
      type: "success",
      message: "Profile updated successfully",
    };

    // ✅ IMPORTANT: return + session.save
    return req.session.save(() => {
      res.redirect("/userprofile");
    });
  } catch (err) {
    console.error("postUserEditDetails Error:", err);

    // ✅ Mongoose validation error
    if (err.name === "ValidationError") {
      req.session.oldInput = req.body;

      const firstErrorMessage = Object.values(err.errors)[0].message;

      req.session.flash = {
        type: "error",
        message: firstErrorMessage,
      };

      // ✅ IMPORTANT: return + session.save
      return req.session.save(() => {
        res.redirect("/userprofile");
      });
    }

    next(err);
  }
};

exports.getUserBankDetailsPage = async (req, res, next) => {
  try {
    if (
      !req.session.isLoggedIn ||
      !req.session.user ||
      req.session.user.role !== "user"
    ) {
      return res.redirect("/login");
    }

    const user = await User.findOne({
      _id: req.session.user._id,
      role: "user",
      userStatus: "active",
    }).select("-password");

    if (!user) {
      req.session.destroy();
      return res.redirect("/login");
    }

    const admin = await User.findOne({ role: "admin" }).select(
      "username phoneNo profilePhoto",
    );

    // 👇 fetch saved bank details
    const bankDetails = await UserBankDetails.findOne({ user: user._id });

    // 👇 old input from session
    const oldInput = req.session.oldInput || {};
    req.session.oldInput = null; // clear after use
    const flash = req.session.flash || null;
    req.session.flash = null; // 👈 clear after use
    res.render("User/userBankDetails", {
      user,
      admin,
      bankDetails,
      oldInput,
      flash,
      isLoggedIn: req.session.isLoggedIn,
    });
  } catch (err) {
    console.error("userBankDetails Error:", err);
    next(err);
  }
};

exports.postUserBankDetails = async (req, res, next) => {
  try {
    if (
      !req.session.isLoggedIn ||
      !req.session.user ||
      req.session.user.role !== "user"
    ) {
      return res.redirect("/login");
    }

    const user = await User.findOne({
      _id: req.session.user._id,
      role: "user",
      userStatus: "active",
    });

    if (!user) {
      req.session.destroy();
      return res.redirect("/login");
    }

    const {
      bankName,
      branchAddress,
      accountHolderName,
      accountNumber,
      ifscCode,
    } = req.body;

    // ❌ validation fail
    if (
      !bankName ||
      !branchAddress ||
      !accountHolderName ||
      !accountNumber ||
      !ifscCode
    ) {
      req.session.oldInput = req.body; // 👈 save old input
      req.session.flash = {
        type: "error",
        message: "All fields are required",
      };
      return res.redirect("/user/bank-details");
    }

    let bankDetails = await UserBankDetails.findOne({ user: user._id });

    if (bankDetails) {
      bankDetails.bankName = bankName;
      bankDetails.branchAddress = branchAddress;
      bankDetails.accountHolderName = accountHolderName;
      bankDetails.accountNumber = accountNumber;
      bankDetails.ifscCode = ifscCode.toUpperCase();
      bankDetails.isVerified = false;
      bankDetails.verifiedBy = null;
      await bankDetails.save();
      req.session.flash = {
        type: "success",
        message: "Bank details updated successfully",
      };
    } else {
      await UserBankDetails.create({
        user: user._id,
        bankName,
        branchAddress,
        accountHolderName,
        accountNumber,
        ifscCode: ifscCode.toUpperCase(),
      });
      req.session.flash = {
        type: "success",
        message: "Bank details added successfully",
      };
    }

    req.session.oldInput = null; // clear
    res.redirect("/userbankdetails");
  } catch (err) {
    console.error("postUserBankDetails Error:", err);

    // ✅ Mongoose Validation Error handle
    if (err.name === "ValidationError") {
      req.session.oldInput = req.body;

      // Extract first validation message
      const firstErrorMessage = Object.values(err.errors)[0].message;

      req.session.flash = {
        type: "error",
        message: firstErrorMessage,
      };

      return res.redirect("/userbankdetails");
    }

    next(err);
  }
};

exports.getUserChangePasswordPage = async (req, res, next) => {
  try {
    // 🔐 User Security Check
    if (
      !req.session.isLoggedIn ||
      !req.session.user ||
      req.session.user.role !== "user"
    ) {
      return res.redirect("/login");
    }

    const user = await User.findOne({
      _id: req.session.user._id,
      role: "user",
      userStatus: "active",
    }).select("-password");

    if (!user) {
      req.session.destroy();
      return res.redirect("/login");
    }

    // Optional: admin info (for header/support)
    const admin = await User.findOne({ role: "admin" }).select(
      "username phoneNo profilePhoto",
    );
    const oldInput = req.session.oldInput || {};
    req.session.oldInput = null; // clear after use
    const flash = req.session.flash || null;
    req.session.flash = null; // 👈 clear after use
    res.render("User/userChangePassword", {
      user,
      admin,
      oldInput,
      flash,
      isLoggedIn: req.session.isLoggedIn,
    });
  } catch (err) {
    console.error("userChangePassword Error:", err);
    next(err);
  }
};

exports.postForgetUserPassword = async (req, res, next) => {
  try {
    // 🔐 User auth check
    if (
      !req.session.isLoggedIn ||
      !req.session.user ||
      req.session.user.role !== "user"
    ) {
      return res.redirect("/login");
    }

    const user = await User.findOne({
      _id: req.session.user._id,
      role: "user",
      userStatus: "active",
    });

    if (!user) {
      req.session.destroy();
      return res.redirect("/login");
    }

    const { oldPassword, newPassword, confirmPassword } = req.body;

    // ❌ Empty validation
    if (!oldPassword || !newPassword || !confirmPassword) {
      req.session.flash = {
        type: "error",
        message: "All password fields are required",
      };
      return req.session.save(() => {
        res.redirect("/forgetuserpassword");
      });
    }

    // ❌ Old password check
    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      req.session.flash = {
        type: "error",
        message: "Old password is incorrect",
      };
      return req.session.save(() => {
        res.redirect("/forgetuserpassword");
      });
    }

    // ❌ New & confirm mismatch
    if (newPassword !== confirmPassword) {
      req.session.flash = {
        type: "error",
        message: "New password and confirm password do not match",
      };
      return req.session.save(() => {
        res.redirect("/forgetuserpassword");
      });
    }

    // ❌ Password length validation
    if (newPassword.length < 6) {
      req.session.flash = {
        type: "error",
        message: "Password must be at least 6 characters long",
      };
      return req.session.save(() => {
        res.redirect("/forgetuserpassword");
      });
    }

    // ❌ Same as old password
    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      req.session.flash = {
        type: "error",
        message: "New password cannot be same as old password",
      };
      return req.session.save(() => {
        res.redirect("/forgetuserpassword");
      });
    }

    // ✅ Hash & save new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    user.password = hashedPassword;
    await user.save();

    req.session.flash = {
      type: "success",
      message: "Password updated successfully",
    };

    return req.session.save(() => {
      res.redirect("/forgetuserpassword");
    });
  } catch (err) {
    console.error("postForgetUserPassword Error:", err);

    req.session.flash = {
      type: "error",
      message: "Something went wrong, please try again",
    };

    return req.session.save(() => {
      res.redirect("/forgetuserpassword");
    });
  }
};

exports.getUserContactAdminPage = async (req, res, next) => {
  try {
    // 🔐 User Security Check
    if (
      !req.session.isLoggedIn ||
      !req.session.user ||
      req.session.user.role !== "user"
    ) {
      return res.redirect("/login");
    }

    const user = await User.findOne({
      _id: req.session.user._id,
      role: "user",
      userStatus: "active",
    }).select("-password");

    if (!user) {
      req.session.destroy();
      return res.redirect("/login");
    }

    // Optional: admin info (for header/support)
    const admin = await User.findOne({ role: "admin" }).select(
      "username phoneNo profilePhoto",
    );

    res.render("User/userContactUs", {
      user,
      admin,
      isLoggedIn: req.session.isLoggedIn,
    });
  } catch (err) {
    console.error("userContactAdmin Error:", err);
    next(err);
  }
};

exports.getUserGameRatesPage = async (req, res, next) => {
  try {
    // 🔐 User Security Check
    if (
      !req.session.isLoggedIn ||
      !req.session.user ||
      req.session.user.role !== "user"
    ) {
      return res.redirect("/login");
    }

    const user = await User.findOne({
      _id: req.session.user._id,
      role: "user",
      userStatus: "active",
    }).select("-password");

    if (!user) {
      req.session.destroy();
      return res.redirect("/login");
    }

    // Optional: admin info (for header/support)
    const admin = await User.findOne({ role: "admin" }).select(
      "username phoneNo profilePhoto",
    );
    // Fetch all game rates
    const gameRates = await GameRate.find({ isActive: true }).sort({
      gameType: 1,
    });
    res.render("User/userGameRates", {
      user,
      admin,
      gameRates,
      isLoggedIn: req.session.isLoggedIn,
    });
  } catch (err) {
    console.error("userGameRates Error:", err);
    next(err);
  }
};

exports.getUserLanguagePage = async (req, res, next) => {
  try {
    // 🔐 User Security Check
    if (
      !req.session.isLoggedIn ||
      !req.session.user ||
      req.session.user.role !== "user"
    ) {
      return res.redirect("/login");
    }

    const user = await User.findOne({
      _id: req.session.user._id,
      role: "user",
      userStatus: "active",
    }).select("-password");

    if (!user) {
      req.session.destroy();
      return res.redirect("/login");
    }

    // Optional: admin info (for header/support)
    const admin = await User.findOne({ role: "admin" }).select(
      "username phoneNo profilePhoto",
    );

    res.render("User/userLanguage", {
      user,
      admin,
      isLoggedIn: req.session.isLoggedIn,
    });
  } catch (err) {
    console.error("userLanguage Error:", err);
    next(err);
  }
};

exports.getPlayGamePage = async (req, res) => {
  try {
    // 🔐 User Security Check
    if (
      !req.session.isLoggedIn ||
      !req.session.user ||
      req.session.user.role !== "user"
    ) {
      return res.redirect("/login");
    }

    const user = await User.findOne({
      _id: req.session.user._id,
      role: "user",
      userStatus: "active",
    }).select("-password");

    if (!user) {
      req.session.destroy();
      return res.redirect("/login");
    }

    const admin = await User.findOne({ role: "admin" }).select(
      "username phoneNo profilePhoto",
    );

    const gameId = req.params.id;
    const game = await Game.findById(gameId);

    if (!game) {
      return res.status(404).send("Game not found");
    }

    // ⏰ SERVER TIME (SAFE)
    const now = moment().tz("Asia/Kolkata");
    const today = now.format("dddd").toLowerCase();

    // 🟢 TODAY SCHEDULE (VERY IMPORTANT)
    const todaySchedule = game.schedule?.[today] || null;

    res.render("User/userMainGame", {
      game,
      admin,
      user,
      todaySchedule, // ✅ FIX HERE
      isLoggedIn: req.session.isLoggedIn,
    });
  } catch (error) {
    console.log(error);
    res.status(500).send("Server error");
  }
};

//Game Betting Logic Start Here
/* ================= PLACE SINGLE DIGIT BET ================= */
exports.placeSingleDigitBet = async (req, res) => {
  try {
    // ✅ AUTH CHECK
    if (
      !req.session.isLoggedIn ||
      !req.session.user ||
      req.session.user.role !== "user"
    ) {
      return res.redirect("/login");
    }

    const user = await User.findOne({
      _id: req.session.user._id,
      role: "user",
      userStatus: "active",
    }).select("-password");

    if (!user) {
      req.session.destroy();
      return res.redirect("/login");
    }

    const { gameId, bets } = req.body;

    if (!gameId || !Array.isArray(bets) || bets.length === 0) {
      return res.json({ success: false, message: "Invalid bet data ❌" });
    }

    const game = await Game.findById(gameId);
    if (!game || game.isDeleted) {
      return res.json({ success: false, message: "Invalid game ❌" });
    }

    const now = moment().tz("Asia/Kolkata");
    const today = now.format("dddd").toLowerCase();
    const schedule = game.schedule?.[today];

    if (!schedule || !schedule.isActive) {
      return res.json({ success: false, message: "Market closed today ❌" });
    }

    let totalAmount = 0;

    // ✅ VALIDATION & OPEN TIME LOCK
    for (const b of bets) {
      if (
        typeof b.number !== "number" ||
        b.number < 0 ||
        b.number > 9 ||
        typeof b.amount !== "number" ||
        b.amount <= 0 ||
        !["OPEN", "CLOSE"].includes(b.mode)
      ) {
        return res.json({
          success: false,
          message: "Invalid digit / amount / mode ❌",
        });
      }

      // 🔒 OPEN TIME LOCK
      if (b.mode === "OPEN") {
        const openMoment = moment.tz(
          `${now.format("YYYY-MM-DD")} ${schedule.openTime}`,
          "YYYY-MM-DD HH:mm",
          "Asia/Kolkata",
        );

        if (now.isSameOrAfter(openMoment)) {
          return res.json({
            success: false,
            message: "Open Time Bet Close ❌",
          });
        }
      }

      totalAmount += b.amount;
    }

    // ✅ WALLET CHECK
    if (user.wallet < totalAmount) {
      return res.json({
        success: false,
        message: "Insufficient wallet balance ❌",
      });
    }

    // ✅ DEDUCT WALLET
    const beforeWallet = user.wallet; // ✅ ADD
    user.wallet -= totalAmount;
    const afterWallet = user.wallet; // ✅ ADD

    await user.save();

    // ✅ SAVE BET
    // Store bets as they come: OPEN and CLOSE in the same document
    await SingleDigitBet.create({
      userId: user._id,
      gameId,
      gameName: game.gameName,
      bets, // array can have mixed OPEN & CLOSE
      beforeWallet, // ✅ ADD
      afterWallet, // ✅ ADD
      totalAmount,
      playedDate: now.format("YYYY-MM-DD"),
      playedTime: now.format("HH:mm"),
      playedWeekday: now.format("dddd"),
    });

    return res.json({
      success: true,
      message: `SINGLE DIGIT Bet placed successfully ₹${totalAmount}`,
    });
  } catch (err) {
    console.error("❌ SINGLE DIGIT BET ERROR:", err);
    return res.json({ success: false, message: "Server error ❌" });
  }
};

/* ================= PLACE SINGLE BULK DIGIT BET ================= */

exports.placeSingleBulkDigitBet = async (req, res) => {
  try {
    // ✅ 1. Authenticate user
    const user = await User.findOne({
      _id: req.session.user._id,
      role: "user",
      userStatus: "active",
    });
    if (!user)
      return res
        .status(401)
        .json({ success: false, message: "Unauthorized ❌" });

    // ✅ 2. Get request data
    const { gameId, bets, totalAmount } = req.body;
    if (!gameId || !Array.isArray(bets) || bets.length === 0)
      return res.json({ success: false, message: "Invalid bet data ❌" });

    // ✅ 3. Fetch game & schedule
    const game = await Game.findById(gameId);
    if (!game || game.isDeleted)
      return res.json({ success: false, message: "Invalid game ❌" });

    const now = moment().tz("Asia/Kolkata");
    const today = now.format("dddd").toLowerCase();
    const schedule = game.schedule?.[today];

    if (!schedule || !schedule.isActive)
      return res.json({ success: false, message: "Market closed today ❌" });

    // ✅ 4. Validate each bet
    for (const b of bets) {
      if (typeof b.number !== "number" || b.number < 0 || b.number > 9)
        return res.json({
          success: false,
          message: `Invalid number ${b.number} ❌`,
        });

      if (!b.amount || b.amount <= 0)
        return res.json({
          success: false,
          message: `Invalid amount for number ${b.number} ❌`,
        });

      if (!["OPEN", "CLOSE"].includes(b.mode))
        return res.json({
          success: false,
          message: `Invalid mode for number ${b.number} ❌`,
        });

      // ✅ 5. Check Open/Close timing
      const openMoment = moment.tz(
        `${now.format("YYYY-MM-DD")} ${schedule.openTime}`,
        "YYYY-MM-DD HH:mm",
        "Asia/Kolkata",
      );
      const closeMoment = moment.tz(
        `${now.format("YYYY-MM-DD")} ${schedule.closeTime}`,
        "YYYY-MM-DD HH:mm",
        "Asia/Kolkata",
      );

      if (b.mode === "OPEN" && now.isSameOrAfter(openMoment))
        return res.json({ success: false, message: "Open Time Bet Close ❌" });

      if (b.mode === "CLOSE" && now.isSameOrAfter(closeMoment))
        return res.json({ success: false, message: "Close Time Bet Close ❌" });
    }

    // ✅ 6. Wallet check
    if (user.wallet < totalAmount)
      return res.json({ success: false, message: "Insufficient balance ❌" });

    // ✅ 7. Deduct wallet
    const beforeWallet = user.wallet; // ✅ ADD
    user.wallet -= totalAmount;
    const afterWallet = user.wallet; // ✅ ADD

    await user.save();

    // ✅ 8. Save bet in DB
    await SingleBulkDigitBet.create({
      userId: user._id,
      gameId,
      gameName: game.gameName,
      bets,
      beforeWallet, // ✅ ADD
      afterWallet, // ✅ ADD
      totalAmount,
      playedDate: now.format("YYYY-MM-DD"),
      playedTime: now.format("HH:mm"),
      playedWeekday: now.format("dddd"),
    });

    return res.json({
      success: true,
      message: `Single Bulk Digit Bet placed ₹${totalAmount} ✅`,
    });
  } catch (err) {
    console.error("Single Bulk Digit Error:", err);
    return res.json({ success: false, message: "Server error ❌" });
  }
};

/* ================= PLACE JODI DIGIT BET ================= */
exports.placeJodiDigitBet = async (req, res) => {
  let user;

  try {
    /* ================= AUTH ================= */
    if (
      !req.session.isLoggedIn ||
      !req.session.user ||
      req.session.user.role !== "user"
    ) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized ❌",
      });
    }

    user = await User.findOne({
      _id: req.session.user._id,
      role: "user",
      userStatus: "active",
    });

    if (!user) {
      req.session.destroy();
      return res.status(401).json({
        success: false,
        message: "Unauthorized ❌",
      });
    }
    // ================= EXTRA SAFETY =================
    if (res.headersSent) return; // ✅ Add here, before wallet deduction / DB write

    /* ================= PAYLOAD ================= */
    const { gameId, gameName, bets } = req.body;

    if (!gameId || !Array.isArray(bets) || bets.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid bet data ❌",
      });
    }

    let totalAmount = 0;

    for (const bet of bets) {
      if (
        typeof bet.mainNo !== "number" ||
        bet.mainNo < 0 ||
        bet.mainNo > 9 ||
        !bet.underNo ||
        !/^[0-9]{2}$/.test(bet.underNo) ||
        typeof bet.amount !== "number" ||
        bet.amount <= 0
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid bet ❌",
        });
      }

      totalAmount += bet.amount;
    }

    /* ================= GAME ================= */
    const game = await Game.findById(gameId);

    if (!game || game.isDeleted) {
      return res.status(400).json({
        success: false,
        message: "Invalid game ❌",
      });
    }

    /* ================= OPEN / CLOSE TIME CHECK ================= */
    const now = moment().tz("Asia/Kolkata").seconds(0).milliseconds(0);
    const today = now.format("dddd").toLowerCase();

    const schedule = game.schedule?.[today];

    if (!schedule || !schedule.isActive) {
      return res.status(400).json({
        success: false,
        message: "Market closed today ❌",
      });
    }

    const openMoment = moment
      .tz(
        `${now.format("YYYY-MM-DD")} ${schedule.openTime}`,
        "YYYY-MM-DD HH:mm",
        "Asia/Kolkata",
      )
      .seconds(0)
      .milliseconds(0);

    // ❗ JODI DIGIT = OPEN ONLY
    if (now.isSameOrAfter(openMoment)) {
      return res.status(400).json({
        success: false,
        message: "Jodi Digit Open Time Over ❌",
      });
    }
    /* ================= WALLET ================= */
    if (user.wallet < totalAmount) {
      return res.status(400).json({
        success: false,
        message: "Insufficient balance ❌",
      });
    }

    const beforeWallet = user.wallet; // ✅ ADD
    user.wallet -= totalAmount;
    const afterWallet = user.wallet; // ✅ ADD

    await user.save();

    /* ================= SAVE BET ================= */
    const betDoc = new JodiDigitBet({
      userId: user._id,
      gameId,
      gameName: game.gameName || gameName,
      bets,
      beforeWallet, // ✅ ADD
      afterWallet, // ✅ ADD
      totalAmount,
      playedDate: now.format("YYYY-MM-DD"),
      playedTime: now.format("HH:mm"),
      playedWeekday: now.format("dddd"),
    });

    await betDoc.save();

    return res.json({
      success: true,
      message: `Jodi Digit bet placed ₹${totalAmount} ✅`,
      wallet: user.wallet,
    });
  } catch (err) {
    console.error("❌ JODI DIGIT ERROR:", err);

    /* ================= REFUND SAFETY ================= */
    if (user && Array.isArray(req.body?.bets)) {
      const refund = req.body.bets.reduce((sum, b) => sum + (b.amount || 0), 0);
      user.wallet += refund;
      await user.save();
    }

    return res.status(500).json({
      success: false,
      message: "Server error ❌",
    });
  }
};

exports.placeJodiDigitBulkBet = async (req, res) => {
  try {
    if (!req.session?.isLoggedIn || req.session.user.role !== "user") {
      return res.json({ success: false, message: "Login required ❌" });
    }

    const user = await User.findById(req.session.user._id);
    if (!user) {
      return res.json({ success: false, message: "User not found ❌" });
    }

    const { gameId, gameName, bets } = req.body;
    if (!Array.isArray(bets) || !bets.length) {
      return res.json({ success: false, message: "No bets ❌" });
    }

    const game = await Game.findById(gameId);
    if (!game) {
      return res.json({ success: false, message: "Invalid game ❌" });
    }

    const now = moment().tz("Asia/Kolkata");
    const today = now.format("dddd").toLowerCase();
    const schedule = game.schedule?.[today];

    if (!schedule?.isActive) {
      return res.json({ success: false, message: "Market closed ❌" });
    }

    let totalAmount = 0;
    const finalBets = [];

    for (const b of bets) {
      const { mainNo, underNos, perUnderNosPoints } = b;

      if (
        typeof mainNo !== "number" ||
        mainNo < 0 ||
        mainNo > 9 ||
        !Array.isArray(underNos) ||
        !underNos.length ||
        perUnderNosPoints <= 0
      ) {
        return res.json({ success: false, message: "Invalid bet data ❌" });
      }

      for (const digit of underNos) {
        finalBets.push({
          mainNo,
          underNo: String(digit).padStart(2, "0"), // "00" – "99"
          amountPerUnderNo: perUnderNosPoints,
          resultStatus: "PENDING",
        });

        totalAmount += perUnderNosPoints;
      }
    }

    if (user.wallet < totalAmount) {
      return res.json({
        success: false,
        message: "Insufficient balance ❌",
      });
    }

    const beforeWallet = user.wallet;
    user.wallet -= totalAmount;
    const afterWallet = user.wallet;
    await user.save();

    await JodiDigitBulkBet.create({
      userId: user._id,
      gameId,
      gameName,
      bets: finalBets,
      beforeWallet,
      afterWallet,
      totalAmount,
      playedDate: now.format("YYYY-MM-DD"),
      playedTime: now.format("HH:mm"),
      playedWeekday: now.format("dddd"),
    });

    return res.json({
      success: true,
      message: `Jodi Digit Bulk bet placed ₹${totalAmount} ✅`,
    });
  } catch (err) {
    console.error("JODI DIGIT BULK ERROR:", err);
    return res.status(500).json({
      success: false,
      message: "Server error ❌",
    });
  }
};


exports.placeSinglePannaBet = async (req, res) => {
  try {
    /* ================= AUTH ================= */
    if (
      !req.session.isLoggedIn ||
      !req.session.user ||
      req.session.user.role !== "user"
    ) {
      return res.redirect("/login");
    }

    const user = await User.findOne({
      _id: req.session.user._id,
      role: "user",
      userStatus: "active",
    }).select("-password");

    if (!user) {
      req.session.destroy();
      return res.redirect("/login");
    }

    /* ================= BODY ================= */
    const { gameId, bets } = req.body;

    if (!gameId || !Array.isArray(bets) || bets.length === 0) {
      return res.json({
        success: false,
        message: "Add at least one panna ❌",
      });
    }

    /* ================= GAME ================= */
    const game = await Game.findById(gameId);
    if (!game || game.isDeleted) {
      return res.json({
        success: false,
        message: "Invalid game ❌",
      });
    }

    /* ================= TIME / SCHEDULE ================= */
    const now = moment().tz("Asia/Kolkata");
    const today = now.format("dddd").toLowerCase();
    const schedule = game.schedule?.[today];

    if (!schedule || !schedule.isActive) {
      return res.json({
        success: false,
        message: "Market closed today ❌",
      });
    }

    /* ================= VALIDATION & TOTAL ================= */
    let totalAmount = 0;

    for (const b of bets) {
      /* BASIC FIELD CHECK */
      if (
        typeof b.mainNo !== "number" ||
        b.mainNo < 0 ||
        b.mainNo > 9 ||
        typeof b.underNo !== "string" ||
        !/^[0-9]{3}$/.test(b.underNo) ||
        typeof b.amount !== "number" ||
        b.amount <= 0 ||
        !["OPEN", "CLOSE"].includes(b.mode)
      ) {
        return res.json({
          success: false,
          message: "Invalid panna data ❌",
        });
      }

      /* PANNA MATCH */
      if (Number(b.underNo[0]) !== b.mainNo) {
        return res.json({
          success: false,
          message: "Under number mismatch ❌",
        });
      }

      /* OPEN TIME LOCK (PER BET) */
      if (b.mode === "OPEN") {
        const openMoment = moment.tz(
          `${now.format("YYYY-MM-DD")} ${schedule.openTime}`,
          "YYYY-MM-DD HH:mm",
          "Asia/Kolkata",
        );

        if (now.isSameOrAfter(openMoment)) {
          return res.json({
            success: false,
            message: "Open time bet closed ❌",
          });
        }
      }

      totalAmount += b.amount;
    }

    /* ================= WALLET ================= */
    if (user.wallet < totalAmount) {
      return res.json({
        success: false,
        message: "Insufficient wallet balance ❌",
      });
    }

    const beforeWallet = user.wallet; // ✅ ADD
    user.wallet -= totalAmount;
    const afterWallet = user.wallet; // ✅ ADD

    await user.save();

    /* ================= SAVE BET ================= */
    await SinglePannaBet.create({
      userId: user._id,
      gameId,
      gameName: game.gameName,
      gameType: "SINGLE_PANNA",
      bets, // 🔥 each bet has its own mode
      beforeWallet, // ✅ ADD
      afterWallet, // ✅ ADD
      totalAmount,
      playedDate: now.format("YYYY-MM-DD"),
      playedTime: now.format("HH:mm"),
      playedWeekday: now.format("dddd"),
    });

    return res.json({
      success: true,
      message: `SINGLE PANNA Bet placed successfully ₹${totalAmount}`,
    });
  } catch (err) {
    console.error("❌ SINGLE PANNA ERROR:", err);
    return res.json({
      success: false,
      message: "Server error ❌",
    });
  }
};

/* ================= PANNA MAP ================= */
const patti_map = {
  0: [127, 136, 145, 190, 235, 280, 370, 479, 460, 569, 389, 578],
  1: [128, 137, 146, 236, 245, 290, 380, 470, 489, 560, 678, 579],
  2: [129, 138, 147, 156, 237, 246, 345, 390, 480, 570, 679, 589],
  3: [120, 139, 148, 157, 238, 247, 256, 346, 490, 580, 670, 689],
  4: [130, 149, 158, 167, 239, 248, 257, 347, 356, 590, 680, 789],
  5: [140, 159, 168, 230, 249, 258, 267, 348, 357, 456, 690, 780],
  6: [123, 150, 169, 178, 240, 259, 268, 349, 358, 457, 367, 790],
  7: [124, 160, 179, 250, 269, 278, 340, 359, 368, 458, 467, 890],
  8: [125, 134, 170, 189, 260, 279, 350, 369, 378, 459, 567, 468],
  9: [126, 135, 180, 234, 270, 289, 360, 379, 450, 469, 478, 568],
};

exports.placeSinglePannaBulkBet = async (req, res) => {
  try {
    /* ===== AUTH ===== */
    if (!req.session?.isLoggedIn || req.session.user.role !== "user") {
      return res.json({ success: false, message: "Login required ❌" });
    }

    const user = await User.findById(req.session.user._id);
    if (!user) {
      return res.json({ success: false, message: "User not found ❌" });
    }

    const { gameId, gameName, bets } = req.body;
    if (!Array.isArray(bets) || !bets.length) {
      return res.json({ success: false, message: "No bets ❌" });
    }

    const game = await Game.findById(gameId);
    if (!game) {
      return res.json({ success: false, message: "Invalid game ❌" });
    }

    const now = moment().tz("Asia/Kolkata");
    const today = now.format("dddd").toLowerCase();
    const schedule = game.schedule?.[today];

    if (!schedule?.isActive) {
      return res.json({ success: false, message: "Market closed ❌" });
    }

    let finalBets = [];
    let totalAmount = 0;

    /* ===== BREAK UI BATCH INTO INDIVIDUAL UNDERNO ===== */
    for (const batch of bets) {
      const { mainNo, underNos, amountPerUnderNo, mode } = batch;

      if (
        typeof mainNo !== "number" ||
        mainNo < 0 ||
        mainNo > 9 ||
        !Array.isArray(underNos) ||
        !underNos.length ||
        amountPerUnderNo <= 0 ||
        !["OPEN", "CLOSE"].includes(mode)
      ) {
        return res.json({ success: false, message: "Invalid bet data ❌" });
      }

      // OPEN lock
      if (mode === "OPEN") {
        const openMoment = moment.tz(
          `${now.format("YYYY-MM-DD")} ${schedule.openTime}`,
          "YYYY-MM-DD HH:mm",
          "Asia/Kolkata"
        );
        if (now.isSameOrAfter(openMoment)) {
          return res.json({
            success: false,
            message: "Open session closed ❌",
          });
        }
      }

      for (const u of underNos) {
        const underNo = String(u).padStart(3, "0");

        if (!patti_map[mainNo].includes(Number(underNo))) {
          return res.json({
            success: false,
            message: `Invalid panna ${underNo} ❌`,
          });
        }

        finalBets.push({
          mainNo,
          underNo,
          amountPerUnderNo,
          mode,
          resultStatus: "PENDING",
        });

        totalAmount += amountPerUnderNo;
      }
    }

    /* ===== WALLET CHECK ===== */
    if (user.wallet < totalAmount) {
      return res.json({
        success: false,
        message: "Insufficient balance ❌",
      });
    }

    const beforeWallet = user.wallet;
    user.wallet -= totalAmount;
    const afterWallet = user.wallet;
    await user.save();

    /* ===== SAVE ===== */
    await SinglePannaBulkBet.create({
      userId: user._id,
      gameId,
      gameName,
      bets: finalBets,
      beforeWallet,
      afterWallet,
      totalAmount,
      playedDate: now.format("YYYY-MM-DD"),
      playedTime: now.format("HH:mm"),
      playedWeekday: now.format("dddd"),
    });

    return res.json({
      success: true,
      message: `Single Panna Bulk bet placed ₹${totalAmount} ✅`,
    });
  } catch (err) {
    console.error("SINGLE PANNA BULK ERROR:", err);
    return res.status(500).json({
      success: false,
      message: "Server error ❌",
    });
  }
};


/* ================= PLACE DOUBLE PANNA BET ================= */
exports.placeDoublePannaBet = async (req, res) => {
  try {
    /* ================= AUTH ================= */
    if (
      !req.session.isLoggedIn ||
      !req.session.user ||
      req.session.user.role !== "user"
    ) {
      return res.redirect("/login");
    }

    const user = await User.findOne({
      _id: req.session.user._id,
      role: "user",
      userStatus: "active",
    }).select("-password");

    if (!user) {
      req.session.destroy();
      return res.redirect("/login");
    }

    /* ================= BODY ================= */
    const { gameId, bets } = req.body;

    if (!gameId || !Array.isArray(bets) || bets.length === 0) {
      return res.json({
        success: false,
        message: "Enter bet amount first ❌",
      });
    }

    /* ================= GAME ================= */
    const game = await Game.findById(gameId);
    if (!game || game.isDeleted) {
      return res.json({
        success: false,
        message: "Invalid game ❌",
      });
    }

    /* ================= TIME / SCHEDULE ================= */
    const now = moment().tz("Asia/Kolkata");
    const today = now.format("dddd").toLowerCase();
    const schedule = game.schedule?.[today];

    if (!schedule || !schedule.isActive) {
      return res.json({
        success: false,
        message: "Market closed today ❌",
      });
    }

    /* ================= VALIDATION & TOTAL ================= */
    let totalAmount = 0;

    for (const b of bets) {
      if (
        typeof b.mainNo !== "number" ||
        b.mainNo < 0 ||
        b.mainNo > 9 ||
        typeof b.underNo !== "string" ||
        !/^[0-9]{3}$/.test(b.underNo) ||
        typeof b.amount !== "number" ||
        b.amount <= 0 ||
        !["OPEN", "CLOSE"].includes(b.mode)
      ) {
        return res.json({
          success: false,
          message: "Invalid panna or amount ❌",
        });
      }

      const pannaSum =
        Number(b.underNo[0]) + Number(b.underNo[1]) + Number(b.underNo[2]);

      if (pannaSum % 10 !== b.mainNo) {
        return res.json({
          success: false,
          message: "UnderNo mismatch ❌",
        });
      }

      if (b.mode === "OPEN") {
        const openMoment = moment.tz(
          `${now.format("YYYY-MM-DD")} ${schedule.openTime}`,
          "YYYY-MM-DD HH:mm",
          "Asia/Kolkata",
        );

        if (now.isSameOrAfter(openMoment)) {
          return res.json({
            success: false,
            message: "Open Time Bet Close ❌",
          });
        }
      }

      totalAmount += b.amount;
    }

    /* ================= WALLET ================= */
    if (user.wallet < totalAmount) {
      return res.json({
        success: false,
        message: "Insufficient wallet balance ❌",
      });
    }

    const beforeWallet = user.wallet; // ✅ ADDED
    user.wallet -= totalAmount;
    const afterWallet = user.wallet; // ✅ ADDED

    await user.save();

    /* ================= SAVE BET ================= */
    await DoublePannaBet.create({
      userId: user._id,
      gameId,
      gameName: game.gameName,
      gameType: "DOUBLE_PANNA",
      bets, // 👈 original bets ONLY
      beforeWallet, // 👈 PARENT LEVEL
      afterWallet, // 👈 PARENT LEVEL
      totalAmount,
      playedDate: now.format("YYYY-MM-DD"),
      playedTime: now.format("HH:mm"),
      playedWeekday: now.format("dddd"),
    });

    return res.json({
      success: true,
      message: `DOUBLE PANNA Bet placed successfully ₹${totalAmount}`,
    });
  } catch (err) {
    console.error("❌ DOUBLE PANNA BET ERROR:", err);
    return res.json({
      success: false,
      message: "Server error ❌",
    });
  }
};

/* ================= PANNA MAP ================= */
const patti_map_DPB = {
  0: [550, 668, 244, 299, 226, 488, 677, 118, 334],
  1: [100, 119, 155, 227, 335, 344, 399, 588, 669],
  2: [200, 110, 228, 255, 336, 499, 660, 688, 778],
  3: [300, 166, 229, 337, 355, 445, 599, 779, 788],
  4: [400, 112, 220, 266, 338, 446, 455, 699, 770],
  5: [500, 113, 122, 177, 339, 366, 447, 799, 889],
  6: [600, 114, 277, 330, 448, 466, 556, 880, 899],
  7: [700, 115, 133, 188, 223, 377, 449, 557, 566],
  8: [800, 116, 224, 233, 288, 440, 477, 558, 990],
  9: [900, 117, 144, 199, 225, 388, 559, 577, 667],
};

exports.placeDoublePannaBulkBet = async (req, res) => {
  try {
    if (!req.session?.isLoggedIn || !req.session.user || req.session.user.role !== "user") {
      return res.status(401).json({ success: false, message: "Login required ❌" });
    }

    const user = await User.findOne({ _id: req.session.user._id, role: "user", userStatus: "active" });
    if (!user) return res.status(401).json({ success: false, message: "User not found ❌" });

    const { gameId, gameName, bets } = req.body;
    if (!gameId || !gameName || !Array.isArray(bets) || bets.length === 0)
      return res.json({ success: false, message: "No bets provided ❌" });

    const game = await Game.findById(gameId);
    if (!game || game.isDeleted) return res.json({ success: false, message: "Invalid game ❌" });

    const now = moment().tz("Asia/Kolkata");
    const today = now.format("dddd").toLowerCase();
    const schedule = game.schedule?.[today];
    if (!schedule?.isActive) return res.json({ success: false, message: "Market closed today ❌" });

    let totalAmount = 0;
    const processedBets = [];

    for (const batch of bets) {
      const { mainNo, underNos, amountPerUnderNo, mode } = batch;

      if (typeof mainNo !== "number" || mainNo < 0 || mainNo > 9 || !Array.isArray(underNos) || underNos.length === 0 || typeof amountPerUnderNo !== "number" || amountPerUnderNo <= 0 || !["OPEN", "CLOSE"].includes(mode)) {
        return res.json({ success: false, message: "Invalid batch data ❌" });
      }

      for (const underNo of underNos) {
        if (!patti_map_DPB[mainNo].includes(Number(underNo))) {
          return res.json({ success: false, message: `Invalid panna ${underNo} ❌` });
        }

        // Open session lock
        if (mode === "OPEN") {
          const openMoment = moment.tz(`${now.format("YYYY-MM-DD")} ${schedule.openTime}`, "YYYY-MM-DD HH:mm", "Asia/Kolkata");
          if (now.isSameOrAfter(openMoment)) {
            return res.json({ success: false, message: "Open session closed ❌" });
          }
        }

        processedBets.push({
          mainNo,
          underNo: String(underNo),
          amountPerUnderNo,
          mode,
          resultStatus: "PENDING",
        });

        totalAmount += amountPerUnderNo;
      }
    }

    if (user.wallet < totalAmount) return res.json({ success: false, message: "Insufficient wallet balance ❌" });

    const beforeWallet = user.wallet;
    user.wallet -= totalAmount;
    const afterWallet = user.wallet;
    await user.save();

    await DoublePannaBulkBet.create({
      userId: user._id,
      gameId,
      gameName,
      bets: processedBets,
      beforeWallet,
      afterWallet,
      totalAmount,
      playedDate: now.format("YYYY-MM-DD"),
      playedTime: now.format("HH:mm"),
      playedWeekday: now.format("dddd"),
    });

    return res.json({ success: true, message: `Bet placed successfully ₹${totalAmount} ✅` });
  } catch (err) {
    console.error("DOUBLE PANNA BULK ERROR:", err);
    return res.status(500).json({ success: false, message: "Server error ❌" });
  }
};


exports.placeTriplePannaBet = async (req, res, next) => {
  try {
    // ✅ AUTH CHECK
    if (
      !req.session.isLoggedIn ||
      !req.session.user ||
      req.session.user.role !== "user"
    ) {
      return res.redirect("/login");
    }

    const user = await User.findOne({
      _id: req.session.user._id,
      role: "user",
      userStatus: "active",
    }).select("-password");

    if (!user) {
      req.session.destroy();
      return res.redirect("/login");
    }

    const { gameId, bets } = req.body;

    if (!gameId || !Array.isArray(bets) || bets.length === 0) {
      return res.json({ success: false, message: "Invalid bet data ❌" });
    }

    const game = await Game.findById(gameId);
    if (!game || game.isDeleted) {
      return res.json({ success: false, message: "Invalid game ❌" });
    }

    const now = moment().tz("Asia/Kolkata");
    const today = now.format("dddd").toLowerCase();
    const schedule = game.schedule?.[today];

    if (!schedule || !schedule.isActive) {
      return res.json({ success: false, message: "Market closed today ❌" });
    }

    let totalAmount = 0;

    // ✅ VALIDATION & OPEN TIME LOCK
    for (const b of bets) {
      if (
        typeof b.number !== "string" ||
        !/^[0-9]{3}$/.test(b.number) || // triple digit check
        typeof b.amount !== "number" ||
        b.amount <= 0 ||
        !["OPEN", "CLOSE"].includes(b.mode)
      ) {
        return res.json({
          success: false,
          message: "Invalid number / amount / mode ❌",
        });
      }

      // 🔒 OPEN TIME LOCK
      if (b.mode === "OPEN") {
        const openMoment = moment.tz(
          `${now.format("YYYY-MM-DD")} ${schedule.openTime}`,
          "YYYY-MM-DD HH:mm",
          "Asia/Kolkata",
        );

        if (now.isSameOrAfter(openMoment)) {
          return res.json({
            success: false,
            message: "Open Time Bet Close ❌",
          });
        }
      }

      totalAmount += b.amount;
    }

    // ✅ WALLET CHECK
    if (user.wallet < totalAmount) {
      return res.json({
        success: false,
        message: "Insufficient wallet balance ❌",
      });
    }

    // ✅ DEDUCT WALLET
    const beforeWallet = user.wallet; // ✅ ADD
    user.wallet -= totalAmount;
    const afterWallet = user.wallet; // ✅ ADD

    await user.save();

    // ✅ SAVE BET
    await TriplePannaBet.create({
      userId: user._id,
      gameId,
      gameName: game.gameName,
      bets, // array can have mixed OPEN & CLOSE
      beforeWallet, // ✅ ADD
      afterWallet, // ✅ ADD
      totalAmount,
      playedDate: now.format("YYYY-MM-DD"),
      playedTime: now.format("HH:mm"),
      playedWeekday: now.format("dddd"),
    });

    return res.json({
      success: true,
      message: `TRIPLE PANNA Bet placed successfully ₹${totalAmount}`,
    });
  } catch (err) {
    console.error("❌ TRIPLE PANNA BET ERROR:", err);
    return res.json({ success: false, message: "Server error ❌" });
  }
};

exports.placeOddEvenBet = async (req, res) => {
  try {
    /* ===== AUTH ===== */
    if (!req.session?.isLoggedIn || req.session.user.role !== "user") {
      return res.json({ success: false, message: "Login required ❌" });
    }

    const user = await User.findById(req.session.user._id);
    if (!user) {
      return res.json({ success: false, message: "User not found ❌" });
    }

    const { gameId, gameName, bets } = req.body;
    if (!Array.isArray(bets) || !bets.length) {
      return res.json({ success: false, message: "No bets ❌" });
    }

    const game = await Game.findById(gameId);
    if (!game) {
      return res.json({ success: false, message: "Invalid game ❌" });
    }

    const now = moment().tz("Asia/Kolkata");
    const today = now.format("dddd").toLowerCase();
    const schedule = game.schedule?.[today];

    if (!schedule?.isActive) {
      return res.json({ success: false, message: "Market closed ❌" });
    }

    let finalBets = [];
    let totalAmount = 0;

    /* ===== BREAK UI BATCH INTO INDIVIDUAL DIGITS ===== */
    for (const bet of bets) {
      const { pattern, underNos, amountPerUnderNo, mode } = bet;

      if (
        !["ODD", "EVEN"].includes(pattern) ||
        !Array.isArray(underNos) ||
        !underNos.length ||
        amountPerUnderNo <= 0 ||
        !["OPEN", "CLOSE"].includes(mode)
      ) {
        return res.json({ success: false, message: "Invalid bet data ❌" });
      }

      // OPEN lock
      if (mode === "OPEN") {
        const openMoment = moment.tz(
          `${now.format("YYYY-MM-DD")} ${schedule.openTime}`,
          "YYYY-MM-DD HH:mm",
          "Asia/Kolkata"
        );
        if (now.isSameOrAfter(openMoment)) {
          return res.json({
            success: false,
            message: "Open session closed ❌",
          });
        }
      }

      const validDigits = pattern === "ODD"
        ? [1, 3, 5, 7, 9]
        : [0, 2, 4, 6, 8];

      for (const d of underNos) {
        const digit = Number(d);
        if (!validDigits.includes(digit)) {
          return res.json({
            success: false,
            message: `Invalid digit ${d} for ${pattern} ❌`,
          });
        }

        finalBets.push({
          pattern,
          underNo: String(digit),
          amountPerUnderNo,
          mode,
          resultStatus: "PENDING",
        });

        totalAmount += amountPerUnderNo;
      }
    }

    /* ===== WALLET ===== */
    if (user.wallet < totalAmount) {
      return res.json({
        success: false,
        message: "Insufficient wallet balance ❌",
      });
    }

    const beforeWallet = user.wallet;
    user.wallet -= totalAmount;
    const afterWallet = user.wallet;
    await user.save();

    /* ===== SAVE ===== */
    await OddEvenBet.create({
      userId: user._id,
      gameId,
      gameName,
      bets: finalBets,
      beforeWallet,
      afterWallet,
      totalAmount,
      playedDate: now.format("YYYY-MM-DD"),
      playedTime: now.format("HH:mm"),
      playedWeekday: now.format("dddd"),
    });

    return res.json({
      success: true,
      message: `Odd–Even bet placed ₹${totalAmount} ✅`,
    });
  } catch (err) {
    console.error("ODD EVEN ERROR:", err);
    return res.status(500).json({
      success: false,
      message: "Server error ❌",
    });
  }
};

/* ================= PLACE HALF SANGAM BET ================= */
exports.placeHalfSangamBet = async (req, res) => {
  try {
    /* ================= AUTH ================= */
    if (
      !req.session?.isLoggedIn ||
      !req.session.user ||
      req.session.user.role !== "user"
    ) {
      return res.status(401).json({
        success: false,
        message: "Login required ❌",
      });
    }

    const user = await User.findOne({
      _id: req.session.user._id,
      role: "user",
      userStatus: "active",
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found ❌",
      });
    }

    /* ================= BODY ================= */
    const { gameId, gameName, bets } = req.body;

    if (!gameId || !gameName || !Array.isArray(bets) || bets.length === 0) {
      return res.json({
        success: false,
        message: "No bets provided ❌",
      });
    }

    /* ================= GAME ================= */
    const game = await Game.findById(gameId);
    if (!game || game.isDeleted) {
      return res.json({
        success: false,
        message: "Invalid game ❌",
      });
    }

    const now = moment().tz("Asia/Kolkata");
    const today = now.format("dddd").toLowerCase();
    const schedule = game.schedule?.[today];

    if (!schedule?.isActive) {
      return res.json({
        success: false,
        message: "Market closed today ❌",
      });
    }

    const openMoment = moment.tz(
      `${now.format("YYYY-MM-DD")} ${schedule.openTime}`,
      "YYYY-MM-DD HH:mm",
      "Asia/Kolkata"
    );

    if (now.isSameOrAfter(openMoment)) {
      return res.json({
        success: false,
        message: "Game Closed ❌",
      });
    }

    /* ================= BET VALIDATION ================= */
    let totalAmount = 0;
    const formattedBets = [];

    for (const bet of bets) {
      const { openPanna, closeDigit, totalAmount: betAmount } = bet;

      if (
        typeof openPanna !== "string" ||
        !/^\d{3}$/.test(openPanna)
      ) {
        return res.json({
          success: false,
          message: "Open Panna must be exactly 3 digits ❌",
        });
      }

      if (
        typeof closeDigit !== "number" ||
        closeDigit < 0 ||
        closeDigit > 9
      ) {
        return res.json({
          success: false,
          message: "Close Digit must be single digit ❌",
        });
      }

      if (
        typeof betAmount !== "number" ||
        betAmount <= 0
      ) {
        return res.json({
          success: false,
          message: "Invalid bet amount ❌",
        });
      }

      totalAmount += betAmount;

      formattedBets.push({
        openPanna, // 🔥 STRING (000 safe)
        closeDigit,
        totalAmount: betAmount,
      });
    }

    /* ================= WALLET ================= */
    if (user.wallet < totalAmount) {
      return res.json({
        success: false,
        message: "Insufficient wallet balance ❌",
      });
    }

    const beforeWallet = user.wallet;
    user.wallet -= totalAmount;
    const afterWallet = user.wallet;
    await user.save();

    /* ================= SAVE BET ================= */
    await HalfSangamBet.create({
      userId: user._id,
      gameId,
      gameName,
      bets: formattedBets,
      beforeWallet,
      afterWallet,
      totalAmount,
      playedDate: now.format("YYYY-MM-DD"),
      playedTime: now.format("HH:mm"),
      playedWeekday: now.format("dddd"),
      resultStatus: "PENDING",
    });

    return res.json({
      success: true,
      message: `Half Sangam bet placed ₹${totalAmount} ✅`,
    });
  } catch (err) {
    console.error("HALF SANGAM ERROR:", err);
    return res.status(500).json({
      success: false,
      message: "Server error ❌",
    });
  }
};

/* ================= PLACE FULL SANGAM BID ================= */
exports.placeFullSangamBet = async (req, res) => {
  try {
    /* ================= AUTH ================= */
    if (
      !req.session?.isLoggedIn ||
      !req.session.user ||
      req.session.user.role !== "user"
    ) {
      return res.status(401).json({
        success: false,
        message: "Login required ❌",
      });
    }

    const user = await User.findOne({
      _id: req.session.user._id,
      role: "user",
      userStatus: "active",
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found ❌",
      });
    }

    /* ================= BODY ================= */
    const { gameId, gameName, bets } = req.body;

    if (!gameId || !gameName || !Array.isArray(bets) || bets.length === 0) {
      return res.json({
        success: false,
        message: "No bets provided ❌",
      });
    }

    /* ================= GAME ================= */
    const game = await Game.findById(gameId);
    if (!game || game.isDeleted) {
      return res.json({
        success: false,
        message: "Invalid game ❌",
      });
    }

    const now = moment().tz("Asia/Kolkata");
    const today = now.format("dddd").toLowerCase();
    const schedule = game.schedule?.[today];

    if (!schedule?.isActive) {
      return res.json({
        success: false,
        message: "Market closed today ❌",
      });
    }

    /* ================= OPEN TIME LOCK ================= */
    const openMoment = moment.tz(
      `${now.format("YYYY-MM-DD")} ${schedule.openTime}`,
      "YYYY-MM-DD HH:mm",
      "Asia/Kolkata",
    );

    if (now.isSameOrAfter(openMoment)) {
      return res.json({
        success: false,
        message: "Game Closed ❌",
      });
    }

/* ================= BET VALIDATION ================= */
let totalAmount = 0;
const formattedBets = [];

for (const bet of bets) {

  const openPannaStr  = bet.openPanna;
  const closePannaStr = bet.closePanna;
  const points        = Number(bet.points);

  if (
    !/^\d{3}$/.test(openPannaStr) ||
    !/^\d{3}$/.test(closePannaStr) ||
    Number.isNaN(points) ||
    points <= 0
  ) {
    return res.json({
      success: false,
      message: "Panna must be 3 digit ❌",
    });
  }

  // ✅ KEEP AS STRING (DO NOT CONVERT)
  const openPanna  = openPannaStr;
  const closePanna = closePannaStr;

  totalAmount += points;

  formattedBets.push({
    openPanna,
    closePanna,
    totalAmount: points,
  });
}


    /* ================= WALLET ================= */
    if (user.wallet < totalAmount) {
      return res.json({
        success: false,
        message: "Insufficient wallet balance ❌",
      });
    }

    const beforeWallet = user.wallet;
    user.wallet -= totalAmount;
    const afterWallet = user.wallet;

    await user.save();

    /* ================= SAVE BET ================= */
    await FullSangamBet.create({
      userId: user._id,
      gameId,
      gameName,
      bets: formattedBets,
      beforeWallet,
      afterWallet,
      totalAmount,
      playedDate: now.format("YYYY-MM-DD"),
      playedTime: now.format("HH:mm"),
      playedWeekday: now.format("dddd"),
      resultStatus: "PENDING",
    });

    return res.json({
      success: true,
      message: `Full Sangam bet placed ₹${totalAmount} ✅`,
    });
  } catch (err) {
    console.error("FULL SANGAM ERROR:", err);
    return res.status(500).json({
      success: false,
      message: "Server error ❌",
    });
  }
};


exports.placeSPMotorBet = async (req, res) => {
  try {
    /* ================= AUTH ================= */
    if (!req.session?.isLoggedIn || req.session.user.role !== "user") {
      return res.json({ success: false, message: "Login required ❌" });
    }

    const user = await User.findById(req.session.user._id);
    if (!user) {
      return res.json({ success: false, message: "User not found ❌" });
    }

    /* ================= BODY ================= */
    const { gameId, gameName, bets } = req.body;

    if (!gameId || !gameName || !Array.isArray(bets) || !bets.length) {
      return res.json({ success: false, message: "No bets ❌" });
    }

    /* ================= GAME ================= */
    const game = await Game.findById(gameId);
    if (!game) {
      return res.json({ success: false, message: "Invalid game ❌" });
    }

    const now = moment().tz("Asia/Kolkata");
    const today = now.format("dddd").toLowerCase();
    const schedule = game.schedule?.[today];

    if (!schedule?.isActive) {
      return res.json({ success: false, message: "Market closed ❌" });
    }

    /* ================= BET PROCESS ================= */
    let totalAmount = 0;
    const finalBets = []; // 🔥 yahin individual bets banenge

    for (const b of bets) {
      const { session, mainNo, underNos, perUnderNosPoints } = b;

      /* ----- BASIC VALIDATION ----- */
      if (
        !["OPEN", "CLOSE"].includes(session) ||
        typeof mainNo !== "number" ||
        mainNo < 0 ||
        mainNo > 9 ||
        !Array.isArray(underNos) ||
        underNos.length === 0 ||
        typeof perUnderNosPoints !== "number" ||
        perUnderNosPoints <= 0
      ) {
        return res.json({
          success: false,
          message: "Invalid bet data ❌",
        });
      }

      /* ----- OPEN SESSION LOCK ----- */
      if (session === "OPEN") {
        const openMoment = moment.tz(
          `${now.format("YYYY-MM-DD")} ${schedule.openTime}`,
          "YYYY-MM-DD HH:mm",
          "Asia/Kolkata"
        );

        if (now.isSameOrAfter(openMoment)) {
          return res.json({
            success: false,
            message: "Open session closed ❌",
          });
        }
      }

      /* ----- 🔥 INDIVIDUAL underNo SAVE ----- */
      for (const uno of underNos) {
        finalBets.push({
          session,
          mainNo,
          underNo: uno,                 // ✅ single underNo
          amountPerUnderNo: perUnderNosPoints
        });

        totalAmount += perUnderNosPoints; // ✅ correct total
      }
    }

    /* ================= WALLET ================= */
    if (user.wallet < totalAmount) {
      return res.json({
        success: false,
        message: "Insufficient balance ❌",
      });
    }

    const beforeWallet = user.wallet;
    user.wallet -= totalAmount;
    const afterWallet = user.wallet;

    await user.save();

    /* ================= SAVE BET ================= */
    await SPMotorBet.create({
      userId: user._id,
      gameId,
      gameName,
      bets: finalBets,        // ✅ individual items
      beforeWallet,
      afterWallet,
      totalAmount,            // ✅ main totalAmount
      playedDate: now.format("YYYY-MM-DD"),
      playedTime: now.format("HH:mm"),
      playedWeekday: now.format("dddd"),
    });

    return res.json({
      success: true,
      message: `SP Motor bet placed ₹${totalAmount} ✅`,
    });
  } catch (err) {
    console.error("SP MOTOR ERROR:", err);
    return res.status(500).json({
      success: false,
      message: "Server error ❌",
    });
  }
};


exports.placeDPMotorBet = async (req, res) => {
    try {
    /* ================= AUTH ================= */
    if (!req.session?.isLoggedIn || req.session.user.role !== "user") {
      return res.json({ success: false, message: "Login required ❌" });
    }

    const user = await User.findById(req.session.user._id);
    if (!user) {
      return res.json({ success: false, message: "User not found ❌" });
    }

    /* ================= BODY ================= */
    const { gameId, gameName, bets } = req.body;

    if (!gameId || !gameName || !Array.isArray(bets) || !bets.length) {
      return res.json({ success: false, message: "No bets ❌" });
    }

    /* ================= GAME ================= */
    const game = await Game.findById(gameId);
    if (!game) {
      return res.json({ success: false, message: "Invalid game ❌" });
    }

    const now = moment().tz("Asia/Kolkata");
    const today = now.format("dddd").toLowerCase();
    const schedule = game.schedule?.[today];

    if (!schedule?.isActive) {
      return res.json({ success: false, message: "Market closed ❌" });
    }

    /* ================= BET PROCESS ================= */
    let totalAmount = 0;
    const finalBets = []; // 🔥 yahin individual bets banenge

    for (const b of bets) {
      const { session, mainNo, underNos, perUnderNosPoints } = b;

      /* ----- BASIC VALIDATION ----- */
      if (
        !["OPEN", "CLOSE"].includes(session) ||
        typeof mainNo !== "number" ||
        mainNo < 0 ||
        mainNo > 9 ||
        !Array.isArray(underNos) ||
        underNos.length === 0 ||
        typeof perUnderNosPoints !== "number" ||
        perUnderNosPoints <= 0
      ) {
        return res.json({
          success: false,
          message: "Invalid bet data ❌",
        });
      }

      /* ----- OPEN SESSION LOCK ----- */
      if (session === "OPEN") {
        const openMoment = moment.tz(
          `${now.format("YYYY-MM-DD")} ${schedule.openTime}`,
          "YYYY-MM-DD HH:mm",
          "Asia/Kolkata"
        );

        if (now.isSameOrAfter(openMoment)) {
          return res.json({
            success: false,
            message: "Open session closed ❌",
          });
        }
      }

      /* ----- 🔥 INDIVIDUAL underNo SAVE ----- */
      for (const uno of underNos) {
        finalBets.push({
          session,
          mainNo,
          underNo: uno,                 // ✅ single underNo
          amountPerUnderNo: perUnderNosPoints
        });

        totalAmount += perUnderNosPoints; // ✅ correct total
      }
    }

    /* ================= WALLET ================= */
    if (user.wallet < totalAmount) {
      return res.json({
        success: false,
        message: "Insufficient balance ❌",
      });
    }

    const beforeWallet = user.wallet;
    user.wallet -= totalAmount;
    const afterWallet = user.wallet;

    await user.save();

    /* ================= SAVE BET ================= */
    await DPMotorBet.create({
      userId: user._id,
      gameId,
      gameName,
      bets: finalBets,        // ✅ individual items
      beforeWallet,
      afterWallet,
      totalAmount,            // ✅ main totalAmount
      playedDate: now.format("YYYY-MM-DD"),
      playedTime: now.format("HH:mm"),
      playedWeekday: now.format("dddd"),
    });

    return res.json({
      success: true,
      message: `DP Motor bet placed ₹${totalAmount} ✅`,
    });
  } catch (err) {
    console.error("DP MOTOR ERROR:", err);
    return res.status(500).json({
      success: false,
      message: "Server error ❌",
    });
  }
};

exports.placeSpDpTpBet = async (req, res) => {
  try {
    /* ================= AUTH ================= */
    if (
      !req.session?.isLoggedIn ||
      !req.session.user ||
      req.session.user.role !== "user"
    ) {
      return res
        .status(401)
        .json({ success: false, message: "Login required ❌" });
    }

    const user = await User.findOne({
      _id: req.session.user._id,
      role: "user",
      userStatus: "active",
    });

    if (!user)
      return res
        .status(401)
        .json({ success: false, message: "User not found ❌" });

    /* ================= BODY ================= */
    const { gameId, gameName, bets } = req.body;

    if (!gameId || !gameName || !Array.isArray(bets) || bets.length === 0) {
      return res.json({ success: false, message: "No bets provided ❌" });
    }

    /* ================= GAME ================= */
    const game = await Game.findById(gameId);
    if (!game || game.isDeleted)
      return res.json({ success: false, message: "Invalid game ❌" });

    const now = moment().tz("Asia/Kolkata");
    const today = now.format("dddd").toLowerCase();
    const schedule = game.schedule?.[today];

    if (!schedule?.isActive)
      return res.json({ success: false, message: "Market closed today ❌" });

    /* ================= EXPLODE BETS ================= */
    let totalAmount = 0;
    const finalBets = [];

    for (const bet of bets) {
      const {
        session,
        type,
        mainNo,
        underNos,
        perUnderNosPoints,
        totalPoints,
      } = bet;

      // ---- BASIC VALIDATION (same as before) ----
      if (
        !session ||
        !["Open", "Close"].includes(session) ||
        !type ||
        !["SP", "DP", "TP"].includes(type) ||
        typeof mainNo !== "number" ||
        mainNo < 0 ||
        mainNo > 9 ||
        !Array.isArray(underNos) ||
        underNos.length === 0 ||
        typeof perUnderNosPoints !== "number" ||
        perUnderNosPoints <= 0 ||
        typeof totalPoints !== "number" ||
        totalPoints <= 0
      ) {
        return res.json({ success: false, message: "Invalid bet data ❌" });
      }

      // ---- OPEN SESSION LOCK ----
      if (session === "Open") {
        const openMoment = moment.tz(
          `${now.format("YYYY-MM-DD")} ${schedule.openTime}`,
          "YYYY-MM-DD HH:mm",
          "Asia/Kolkata"
        );
        if (now.isSameOrAfter(openMoment)) {
          return res.json({
            success: false,
            message: "Open session closed ❌",
          });
        }
      }

      // ---- 🔥 INDIVIDUAL UNDERNO SAVE ----
      for (const num of underNos) {
        if (!/^\d{3}$/.test(num)) {
          return res.json({
            success: false,
            message: "Invalid under number ❌",
          });
        }

        finalBets.push({
          session,
          type,
          mainNo,
          underNo: num,                 // ✅ NEW
          amountPerUnderNo: perUnderNosPoints, // ✅ NEW
          resultStatus: "PENDING",
        });

        totalAmount += perUnderNosPoints;
      }
    }

    /* ================= WALLET ================= */
    if (user.wallet < totalAmount) {
      return res.json({
        success: false,
        message: "Insufficient wallet balance ❌",
      });
    }

    const beforeWallet = user.wallet;
    user.wallet -= totalAmount;
    const afterWallet = user.wallet;
    await user.save();

    /* ================= SAVE ================= */
    await spdptpBet.create({
      userId: user._id,
      gameId,
      gameName,
      bets: finalBets, // ✅ individual entries
      beforeWallet,
      afterWallet,
      totalAmount,
      playedDate: now.format("YYYY-MM-DD"),
      playedTime: now.format("HH:mm"),
      playedWeekday: now.format("dddd"),
    });

    return res.json({
      success: true,
      message: `SP DP TP bet placed ₹${totalAmount} ✅`,
    });
  } catch (err) {
    console.error("SPDPTP ERROR:", err);
    return res.status(500).json({
      success: false,
      message: "Server error ❌",
    });
  }
};


exports.placeRedBracketBet = async (req, res) => {
  try {
    if (!req.session?.user) {
      return res.status(401).json({ success: false, message: "Login required ❌" });
    }

    const user = await User.findById(req.session.user._id);
    if (!user) {
      return res.json({ success: false, message: "User not found ❌" });
    }

    const { gameId, gameName, bets } = req.body;
    if (!Array.isArray(bets) || bets.length === 0) {
      return res.json({ success: false, message: "No bets ❌" });
    }

    const now = moment().tz("Asia/Kolkata");

    let totalAmount = 0;
    const finalBets = [];

    for (const bet of bets) {
      const { bracketType, underDigits, totalPoints } = bet;

      if (
        !["HALF", "FULL"].includes(bracketType) ||
        !Array.isArray(underDigits) ||
        underDigits.length === 0 ||
        totalPoints <= 0
      ) {
        return res.json({ success: false, message: "Invalid bet data ❌" });
      }

      const perUnderNoAmount = totalPoints / underDigits.length;

      for (const digit of underDigits) {
        finalBets.push({
          bracketType,
          underNo: digit,                 // ✅ OLD NAME
          amountPerUnderNo: perUnderNoAmount,
        });

        totalAmount += perUnderNoAmount;
      }
    }

    if (user.wallet < totalAmount) {
      return res.json({ success: false, message: "Insufficient balance ❌" });
    }

    const beforeWallet = user.wallet;
    user.wallet -= totalAmount;
    const afterWallet = user.wallet;
    await user.save();

    await RedBracketBet.create({
      userId: user._id,
      gameId,
      gameName,
      bets: finalBets,
      beforeWallet,
      afterWallet,
      totalAmount,
      playedDate: now.format("YYYY-MM-DD"),
      playedTime: now.format("HH:mm"),
      playedWeekday: now.format("dddd"),
    });

    return res.json({
      success: true,
      message: `Red Bracket bet placed ₹${totalAmount} ✅`,
    });

  } catch (err) {
    console.error("RED BRACKET ERROR:", err);
    res.status(500).json({ success: false, message: "Server error ❌" });
  }
};



// Starline game code
exports.getStarLinePlayGamePage = async (req, res, next) => {
  try {
    // 🔐 User Security Check
    if (
      !req.session.isLoggedIn ||
      !req.session.user ||
      req.session.user.role !== "user"
    ) {
      return res.redirect("/login");
    }

    const user = await User.findOne({
      _id: req.session.user._id,
      role: "user",
      userStatus: "active",
    }).select("-password");

    if (!user) {
      req.session.destroy();
      return res.redirect("/login");
    }

    const admin = await User.findOne({ role: "admin" }).select(
      "username phoneNo profilePhoto",
    );

    const gameId = req.params.id;
    const game = await Game.findById(gameId);

    if (!game) {
      return res.status(404).send("Game not found");
    }

    // ⏰ SERVER TIME (SAFE)
    const now = moment().tz("Asia/Kolkata");
    const today = now.format("dddd").toLowerCase();

    // 🟢 TODAY SCHEDULE (VERY IMPORTANT)
    const todaySchedule = game.schedule?.[today] || null;

    res.render("User/userStarlineGame", {
      game,
      admin,
      user,
      todaySchedule, // ✅ FIX HERE
      isLoggedIn: req.session.isLoggedIn,
    });
  } catch (error) {
    console.log(error);
    res.status(500).send("Server error");
  }
};

exports.placeStarlineSingleDigitBet = async (req, res, next) => {
  try {
    // ✅ AUTH CHECK
    if (
      !req.session.isLoggedIn ||
      !req.session.user ||
      req.session.user.role !== "user"
    ) {
      return res.redirect("/login");
    }

    const user = await User.findOne({
      _id: req.session.user._id,
      role: "user",
      userStatus: "active",
    }).select("-password");

    if (!user) {
      req.session.destroy();
      return res.redirect("/login");
    }

    const { gameId, bets } = req.body;

    if (!gameId || !Array.isArray(bets) || bets.length === 0) {
      return res.json({ success: false, message: "Invalid bet data ❌" });
    }

    const game = await Game.findById(gameId);
    if (!game || game.isDeleted) {
      return res.json({ success: false, message: "Invalid game ❌" });
    }

    const now = moment().tz("Asia/Kolkata");
    const today = now.format("dddd").toLowerCase();
    const schedule = game.schedule?.[today];

    if (!schedule || !schedule.isActive) {
      return res.json({ success: false, message: "Market closed today ❌" });
    }

    let totalAmount = 0;

    // ✅ VALIDATION & OPEN TIME LOCK
    for (const b of bets) {
      if (
        typeof b.number !== "number" ||
        b.number < 0 ||
        b.number > 9 ||
        typeof b.amount !== "number" ||
        b.amount <= 0 ||
        !["OPEN", "CLOSE"].includes(b.mode)
      ) {
        return res.json({
          success: false,
          message: "Invalid digit / amount / mode ❌",
        });
      }

      // 🔒 OPEN TIME LOCK
      if (b.mode === "OPEN") {
        const openMoment = moment.tz(
          `${now.format("YYYY-MM-DD")} ${schedule.openTime}`,
          "YYYY-MM-DD HH:mm",
          "Asia/Kolkata",
        );

        if (now.isSameOrAfter(openMoment)) {
          return res.json({
            success: false,
            message: "Open Time Bet Close ❌",
          });
        }
      }

      totalAmount += b.amount;
    }

    // ✅ WALLET CHECK
    if (user.wallet < totalAmount) {
      return res.json({
        success: false,
        message: "Insufficient wallet balance ❌",
      });
    }

    // ✅ DEDUCT WALLET
    const beforeWallet = user.wallet; // ✅ ADD
    user.wallet -= totalAmount;
    const afterWallet = user.wallet; // ✅ ADD

    await user.save();

    // ✅ SAVE BET
    // Store bets as they come: OPEN and CLOSE in the same document
    await starlineSingleDigitBet.create({
      userId: user._id,
      gameId,
      gameName: game.gameName,
      bets, // array can have mixed OPEN & CLOSE
      beforeWallet, // ✅ ADD
      afterWallet, // ✅ ADD
      totalAmount,
      playedDate: now.format("YYYY-MM-DD"),
      playedTime: now.format("HH:mm"),
      playedWeekday: now.format("dddd"),
    });

    return res.json({
      success: true,
      message: `SINGLE DIGIT Bet placed successfully ₹${totalAmount}`,
    });
  } catch (err) {
    console.error("❌ SINGLE DIGIT BET ERROR:", err);
    return res.json({ success: false, message: "Server error ❌" });
  }
};

exports.placeStarlineSinglePannaBet = async (req, res, next) => {
  try {
    /* ================= AUTH ================= */
    if (
      !req.session.isLoggedIn ||
      !req.session.user ||
      req.session.user.role !== "user"
    ) {
      return res.redirect("/login");
    }

    const user = await User.findOne({
      _id: req.session.user._id,
      role: "user",
      userStatus: "active",
    }).select("-password");

    if (!user) {
      req.session.destroy();
      return res.redirect("/login");
    }

    /* ================= BODY ================= */
    const { gameId, bets } = req.body;

    if (!gameId || !Array.isArray(bets) || bets.length === 0) {
      return res.json({
        success: false,
        message: "Add at least one panna ❌",
      });
    }

    /* ================= GAME ================= */
    const game = await Game.findById(gameId);
    if (!game || game.isDeleted) {
      return res.json({
        success: false,
        message: "Invalid game ❌",
      });
    }

    /* ================= TIME / SCHEDULE ================= */
    const now = moment().tz("Asia/Kolkata");
    const today = now.format("dddd").toLowerCase();
    const schedule = game.schedule?.[today];

    if (!schedule || !schedule.isActive) {
      return res.json({
        success: false,
        message: "Market closed today ❌",
      });
    }

    /* ================= VALIDATION & TOTAL ================= */
    let totalAmount = 0;

    for (const b of bets) {
      /* BASIC FIELD CHECK */
      if (
        typeof b.mainNo !== "number" ||
        b.mainNo < 0 ||
        b.mainNo > 9 ||
        typeof b.underNo !== "string" ||
        !/^[0-9]{3}$/.test(b.underNo) ||
        typeof b.amount !== "number" ||
        b.amount <= 0 ||
        !["OPEN", "CLOSE"].includes(b.mode)
      ) {
        return res.json({
          success: false,
          message: "Invalid panna data ❌",
        });
      }

      /* PANNA MATCH */
      if (Number(b.underNo[0]) !== b.mainNo) {
        return res.json({
          success: false,
          message: "Under number mismatch ❌",
        });
      }

      /* OPEN TIME LOCK (PER BET) */
      if (b.mode === "OPEN") {
        const openMoment = moment.tz(
          `${now.format("YYYY-MM-DD")} ${schedule.openTime}`,
          "YYYY-MM-DD HH:mm",
          "Asia/Kolkata",
        );

        if (now.isSameOrAfter(openMoment)) {
          return res.json({
            success: false,
            message: "Open time bet closed ❌",
          });
        }
      }

      totalAmount += b.amount;
    }

    /* ================= WALLET ================= */
    if (user.wallet < totalAmount) {
      return res.json({
        success: false,
        message: "Insufficient wallet balance ❌",
      });
    }

    const beforeWallet = user.wallet; // ✅ ADD
    user.wallet -= totalAmount;
    const afterWallet = user.wallet; // ✅ ADD

    await user.save();

    /* ================= SAVE BET ================= */
    await StarlineSinglePannaBet.create({
      userId: user._id,
      gameId,
      gameName: game.gameName,
      gameType: "SINGLE_PANNA",
      bets, // 🔥 each bet has its own mode
      beforeWallet, // ✅ ADD
      afterWallet, // ✅ ADD
      totalAmount,
      playedDate: now.format("YYYY-MM-DD"),
      playedTime: now.format("HH:mm"),
      playedWeekday: now.format("dddd"),
    });

    return res.json({
      success: true,
      message: `SINGLE PANNA Bet placed successfully ₹${totalAmount}`,
    });
  } catch (err) {
    console.error("❌ SINGLE PANNA ERROR:", err);
    return res.json({
      success: false,
      message: "Server error ❌",
    });
  }
};



exports.placeStarlineDoublePannaBet = async (req, res, next) => {
  try {
    /* ================= AUTH ================= */
    if (
      !req.session.isLoggedIn ||
      !req.session.user ||
      req.session.user.role !== "user"
    ) {
      return res.redirect("/login");
    }

    const user = await User.findOne({
      _id: req.session.user._id,
      role: "user",
      userStatus: "active",
    }).select("-password");

    if (!user) {
      req.session.destroy();
      return res.redirect("/login");
    }

    /* ================= BODY ================= */
    const { gameId, bets } = req.body;

    if (!gameId || !Array.isArray(bets) || bets.length === 0) {
      return res.json({
        success: false,
        message: "Enter bet amount first ❌",
      });
    }

    /* ================= GAME ================= */
    const game = await Game.findById(gameId);
    if (!game || game.isDeleted) {
      return res.json({
        success: false,
        message: "Invalid game ❌",
      });
    }

    /* ================= TIME / SCHEDULE ================= */
    const now = moment().tz("Asia/Kolkata");
    const today = now.format("dddd").toLowerCase();
    const schedule = game.schedule?.[today];

    if (!schedule || !schedule.isActive) {
      return res.json({
        success: false,
        message: "Market closed today ❌",
      });
    }

    /* ================= VALIDATION & TOTAL ================= */
    let totalAmount = 0;

    for (const b of bets) {
      if (
        typeof b.mainNo !== "number" ||
        b.mainNo < 0 ||
        b.mainNo > 9 ||
        typeof b.underNo !== "string" ||
        !/^[0-9]{3}$/.test(b.underNo) ||
        typeof b.amount !== "number" ||
        b.amount <= 0 ||
        !["OPEN", "CLOSE"].includes(b.mode)
      ) {
        return res.json({
          success: false,
          message: "Invalid panna or amount ❌",
        });
      }

      const pannaSum =
        Number(b.underNo[0]) + Number(b.underNo[1]) + Number(b.underNo[2]);

      if (pannaSum % 10 !== b.mainNo) {
        return res.json({
          success: false,
          message: "UnderNo mismatch ❌",
        });
      }

      if (b.mode === "OPEN") {
        const openMoment = moment.tz(
          `${now.format("YYYY-MM-DD")} ${schedule.openTime}`,
          "YYYY-MM-DD HH:mm",
          "Asia/Kolkata",
        );

        if (now.isSameOrAfter(openMoment)) {
          return res.json({
            success: false,
            message: "Open Time Bet Close ❌",
          });
        }
      }

      totalAmount += b.amount;
    }

    /* ================= WALLET ================= */
    if (user.wallet < totalAmount) {
      return res.json({
        success: false,
        message: "Insufficient wallet balance ❌",
      });
    }

    const beforeWallet = user.wallet; // ✅ ADDED
    user.wallet -= totalAmount;
    const afterWallet = user.wallet; // ✅ ADDED

    await user.save();

    /* ================= SAVE BET ================= */
    await StarlineDoublePannaBet.create({
      userId: user._id,
      gameId,
      gameName: game.gameName,
      gameType: "DOUBLE_PANNA",
      bets, // 👈 original bets ONLY
      beforeWallet, // 👈 PARENT LEVEL
      afterWallet, // 👈 PARENT LEVEL
      totalAmount,
      playedDate: now.format("YYYY-MM-DD"),
      playedTime: now.format("HH:mm"),
      playedWeekday: now.format("dddd"),
    });

    return res.json({
      success: true,
      message: `DOUBLE PANNA Bet placed successfully ₹${totalAmount}`,
    });
  } catch (err) {
    console.error("❌ DOUBLE PANNA BET ERROR:", err);
    return res.json({
      success: false,
      message: "Server error ❌",
    });
  }
};

exports.placeStarlineTriplePannaBet = async (req, res, next) => {
  try {
    // ✅ AUTH CHECK
    if (
      !req.session.isLoggedIn ||
      !req.session.user ||
      req.session.user.role !== "user"
    ) {
      return res.redirect("/login");
    }

    const user = await User.findOne({
      _id: req.session.user._id,
      role: "user",
      userStatus: "active",
    }).select("-password");

    if (!user) {
      req.session.destroy();
      return res.redirect("/login");
    }

    const { gameId, bets } = req.body;

    if (!gameId || !Array.isArray(bets) || bets.length === 0) {
      return res.json({ success: false, message: "Invalid bet data ❌" });
    }

    const game = await Game.findById(gameId);
    if (!game || game.isDeleted) {
      return res.json({ success: false, message: "Invalid game ❌" });
    }

    const now = moment().tz("Asia/Kolkata");
    const today = now.format("dddd").toLowerCase();
    const schedule = game.schedule?.[today];

    if (!schedule || !schedule.isActive) {
      return res.json({ success: false, message: "Market closed today ❌" });
    }

    let totalAmount = 0;

    // ✅ VALIDATION & OPEN TIME LOCK
    for (const b of bets) {
      if (
        typeof b.number !== "string" ||
        !/^[0-9]{3}$/.test(b.number) || // triple digit check
        typeof b.amount !== "number" ||
        b.amount <= 0 ||
        !["OPEN", "CLOSE"].includes(b.mode)
      ) {
        return res.json({
          success: false,
          message: "Invalid number / amount / mode ❌",
        });
      }

      // 🔒 OPEN TIME LOCK
      if (b.mode === "OPEN") {
        const openMoment = moment.tz(
          `${now.format("YYYY-MM-DD")} ${schedule.openTime}`,
          "YYYY-MM-DD HH:mm",
          "Asia/Kolkata",
        );

        if (now.isSameOrAfter(openMoment)) {
          return res.json({
            success: false,
            message: "Open Time Bet Close ❌",
          });
        }
      }

      totalAmount += b.amount;
    }

    // ✅ WALLET CHECK
    if (user.wallet < totalAmount) {
      return res.json({
        success: false,
        message: "Insufficient wallet balance ❌",
      });
    }

    // ✅ DEDUCT WALLET
    const beforeWallet = user.wallet; // ✅ ADD
    user.wallet -= totalAmount;
    const afterWallet = user.wallet; // ✅ ADD

    await user.save();

    // ✅ SAVE BET
    await StarlineTripplePannaBet.create({
      userId: user._id,
      gameId,
      gameName: game.gameName,
      bets, // array can have mixed OPEN & CLOSE
      beforeWallet, // ✅ ADD
      afterWallet, // ✅ ADD
      totalAmount,
      playedDate: now.format("YYYY-MM-DD"),
      playedTime: now.format("HH:mm"),
      playedWeekday: now.format("dddd"),
    });

    return res.json({
      success: true,
      message: `TRIPLE PANNA Bet placed successfully ₹${totalAmount}`,
    });
  } catch (err) {
    console.error("❌ TRIPLE PANNA BET ERROR:", err);
    return res.json({ success: false, message: "Server error ❌" });
  }
};

//Jackpot Game Data Submit Controller function Start Here
exports.getJackpotPlayGamePage = async (req, res, next) => {
  try {
    // 🔐 User Security Check
    if (
      !req.session.isLoggedIn ||
      !req.session.user ||
      req.session.user.role !== "user"
    ) {
      return res.redirect("/login");
    }

    const user = await User.findOne({
      _id: req.session.user._id,
      role: "user",
      userStatus: "active",
    }).select("-password");

    if (!user) {
      req.session.destroy();
      return res.redirect("/login");
    }

    const admin = await User.findOne({ role: "admin" }).select(
      "username phoneNo profilePhoto",
    );

    const gameId = req.params.id;
    const game = await Game.findById(gameId);

    if (!game) {
      return res.status(404).send("Game not found");
    }

    // ⏰ SERVER TIME (SAFE)
    const now = moment().tz("Asia/Kolkata");
    const today = now.format("dddd").toLowerCase();

    // 🟢 TODAY SCHEDULE (VERY IMPORTANT)
    const todaySchedule = game.schedule?.[today] || null;

    res.render("User/userJackpotGame", {
      game,
      admin,
      user,
      todaySchedule, // ✅ FIX HERE
      isLoggedIn: req.session.isLoggedIn,
    });
  } catch (error) {
    console.log(error);
    res.status(500).send("Server error");
  }
};

exports.placeJackpotRightDigitBet = async (req, res) => {
  try {
    const user = await User.findById(req.session.user._id);
    if (!user)
      return res.json({ success: false, message: "User not found ❌" });

    const { gameId, bets } = req.body;
    if (!gameId || !bets?.length)
      return res.json({ success: false, message: "Invalid bet ❌" });

    const game = await Game.findById(gameId);
    if (!game || game.isDeleted)
      return res.json({ success: false, message: "Invalid game ❌" });

    // Check openTime
    const now = moment().tz("Asia/Kolkata");
    const openTime =
      game.schedule?.[now.format("dddd").toLowerCase()]?.openTime;
    if (openTime && now.format("HH:mm") >= openTime) {
      return res.json({ success: false, message: "Game closed ❌" });
    }

    const totalAmount = bets.reduce((sum, b) => sum + Number(b.amount || 0), 0);
    if (user.wallet < totalAmount)
      return res.json({ success: false, message: "Insufficient balance ❌" });

    const beforeWallet = user.wallet; // ✅ ADD
    user.wallet -= totalAmount;
    const afterWallet = user.wallet; // ✅ ADD

    await user.save();

    await RightDigitBet.create({
      userId: user._id,
      gameId,
      gameName: game.gameName,
      bets,
      beforeWallet, // ✅ ADD
      afterWallet, // ✅ ADD
      totalAmount,
      playedDate: now.format("YYYY-MM-DD"),
      playedTime: now.format("HH:mm"),
      playedWeekday: now.format("dddd"),
    });

    return res.json({
      success: true,
      message: `Bet placed ₹${totalAmount} ✅`,
    });
  } catch (err) {
    console.error("RightDigitBet Error:", err);
    res.json({ success: false, message: "Server error ❌" });
  }
};

exports.placeJackpotLeftDigitBet = async (req, res, next) => {
  try {
    const user = await User.findById(req.session.user._id);
    if (!user)
      return res.json({ success: false, message: "User not found ❌" });

    const { gameId, bets } = req.body;
    if (!gameId || !bets?.length)
      return res.json({ success: false, message: "Invalid bet ❌" });

    const game = await Game.findById(gameId);
    if (!game || game.isDeleted)
      return res.json({ success: false, message: "Invalid game ❌" });

    // Check openTime
    const now = moment().tz("Asia/Kolkata");
    const openTime =
      game.schedule?.[now.format("dddd").toLowerCase()]?.openTime;
    if (openTime && now.format("HH:mm") >= openTime) {
      return res.json({ success: false, message: "Game closed ❌" });
    }

    const totalAmount = bets.reduce((sum, b) => sum + Number(b.amount || 0), 0);
    if (user.wallet < totalAmount)
      return res.json({ success: false, message: "Insufficient balance ❌" });

    const beforeWallet = user.wallet; // ✅ ADD
    user.wallet -= totalAmount;
    const afterWallet = user.wallet; // ✅ ADD

    await user.save();

    await LeftDigitBet.create({
      userId: user._id,
      gameId,
      gameName: game.gameName,
      bets,
      beforeWallet, // ✅ ADD
      afterWallet, // ✅ ADD
      totalAmount,
      playedDate: now.format("YYYY-MM-DD"),
      playedTime: now.format("HH:mm"),
      playedWeekday: now.format("dddd"),
    });

    return res.json({
      success: true,
      message: `Bet placed ₹${totalAmount} ✅`,
    });
  } catch (err) {
    console.error("LeftDigitBet Error:", err);
    res.json({ success: false, message: "Server error ❌" });
  }
};

exports.placeJackpotCenterJodiDigitBet = async (req, res, next) => {
  try {
    const user = await User.findById(req.session.user._id);
    if (!user)
      return res.json({ success: false, message: "User not found ❌" });

    const { gameId, bets } = req.body;
    if (!gameId || !bets?.length)
      return res.json({ success: false, message: "Invalid bet ❌" });

    const game = await Game.findById(gameId);
    if (!game || game.isDeleted)
      return res.json({ success: false, message: "Invalid game ❌" });

    // Check openTime
    const now = moment().tz("Asia/Kolkata");
    const openTime =
      game.schedule?.[now.format("dddd").toLowerCase()]?.openTime;
    if (openTime && now.format("HH:mm") >= openTime) {
      return res.json({ success: false, message: "Game closed ❌" });
    }
    for (const bet of bets) {
      if (!/^[0-9]{2}$/.test(bet.openDigit)) {
        return res.json({
          success: false,
          message: "Invalid Jodi Digit ❌",
        });
      }

      if (!bet.amount || bet.amount <= 0) {
        return res.json({
          success: false,
          message: "Invalid bet amount ❌",
        });
      }
    }
    const totalAmount = bets.reduce((sum, b) => sum + Number(b.amount || 0), 0);
    if (user.wallet < totalAmount)
      return res.json({ success: false, message: "Insufficient balance ❌" });

    const beforeWallet = user.wallet; // ✅ ADD
    user.wallet -= totalAmount;
    const afterWallet = user.wallet; // ✅ ADD
    await user.save();

    await JackpotCentreJodiDigitBet.create({
      userId: user._id,
      gameId,
      gameName: game.gameName,
      bets,
      beforeWallet, // ✅ ADD
      afterWallet, // ✅ ADD
      totalAmount,
      playedDate: now.format("YYYY-MM-DD"),
      playedTime: now.format("HH:mm"),
      playedWeekday: now.format("dddd"),
    });

    return res.json({
      success: true,
      message: `Bet placed ₹${totalAmount} ✅`,
    });
  } catch (err) {
    console.error("JodiDigitBet Error:", err);
    res.json({ success: false, message: "Server error ❌" });
  }
};

//Win history code

// Bet models
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
  require("../model/StarlineSingleDigitBet"),
  require("../model/StarlineSinglePannaBet"),
  require("../model/StarlineDoublePannaBet"),
  require("../model/StarlineTriplePannaBet"),
  require("../model/JackpotLeftDigitBet"),
  require("../model/JackpotRightDigitBet"),
  require("../model/JackpotCentreJodiDigitBet"),
];

exports.getUserWinHistory = async (req, res, next) => {
  try {
    // AUTH CHECK
    if (!req.session.isLoggedIn || req.session.user.role !== "user") {
      return res.redirect("/login");
    }

    const user = await User.findOne({
      _id: req.session.user._id,
      userStatus: "active",
    }).lean();

    if (!user) return res.redirect("/login");

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const { source, startDate, endDate, mainGame, gameName } = req.query;

    const now = new Date();
    let fromDate = null;
    let toDate = null;

    // DATE FILTER LOGIC (UNCHANGED)
    if (startDate && endDate) {
      fromDate = new Date(startDate);
      toDate = new Date(endDate);
      toDate.setHours(23, 59, 59, 999);
    } else if (source) {
      switch (source) {
        case "source1": // Live 24h
          fromDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          toDate = now;
          break;
        case "source3": // Old 3 months
          fromDate = new Date();
          fromDate.setMonth(fromDate.getMonth() - 3);
          toDate = now;
          break;
        case "source2": // Backup 6 months
          fromDate = new Date();
          fromDate.setMonth(fromDate.getMonth() - 6);
          toDate = now;
          break;
      }
    }

    const dateFilter =
      fromDate && toDate ? { createdAt: { $gte: fromDate, $lte: toDate } } : {};

    let allWinRows = [];

    // MAIN GAME MAP (UNCHANGED)
    const mainGameMap = {
      "Main Market": "MAIN_GAME",
      Jackpot: "JACKPOT",
      Starline: "STARLINE",
    };
    const mainGameValue = mainGame ? mainGameMap[mainGame] : null;

    // LOOP ALL BET COLLECTIONS
    for (const Model of betModels) {
      const query = { userId: user._id, ...dateFilter };

      if (mainGameValue) query.mainGame = mainGameValue;
      if (gameName) query.gameName = { $regex: gameName, $options: "i" };

      const records = await Model.find(query).lean();

      records.forEach((bet) => {
        // CASE 1: MODELS WITH bets ARRAY
        if (Array.isArray(bet.bets) && bet.bets.length > 0) {
          bet.bets.forEach((b) => {
            if (b.resultStatus !== "WIN") return;

            allWinRows.push({
              gameType: bet.gameType ?? "-",
              mainGame: bet.mainGame ?? "-",
              gameName: bet.gameName ?? "-",
              createdAt: bet.createdAt,
              session: b.session ?? b.mode ?? "-",

              // 🔥 FIXED (0 / 00 / 000 SAFE)
              amount: Number(
                b.totalPoints ?? b.totalAmount ?? b.amount ?? 0
              ),
              mainNo: b.mainNo ?? "-",
              number: b.number ?? "-",
              openPanna: b.openPanna ?? "-",
              closePanna: b.closePanna ?? "-",
              openDigit: b.openDigit ?? "-",
              closeDigit: b.closeDigit ?? "-",
              pattern: b.pattern ?? "-",
              bracketType: b.bracketType ?? "-",
              type: b.type ?? "-",

              resultStatus: "WIN",
            });
          });
        }

        // CASE 2: MODELS WITHOUT bets ARRAY
        else if (bet.resultStatus === "WIN") {
          allWinRows.push({
            gameType: bet.gameType ?? "-",
            mainGame: bet.mainGame ?? "-",
            gameName: bet.gameName ?? "-",
            createdAt: bet.createdAt,
            session: bet.session ?? "-",

            // 🔥 FIXED (0 / totalPoints SAFE)
            amount: Number(
              bet.amount ?? bet.totalPoints ?? 0
            ),
            mainNo: bet.mainNo ?? "-",
            number: bet.number ?? "-",
            openPanna: bet.openPanna ?? "-",
            closePanna: bet.closePanna ?? "-",
            openDigit: bet.openDigit ?? "-",
            closeDigit: bet.closeDigit ?? "-",
            pattern: bet.pattern ?? "-",
            bracketType: bet.bracketType ?? "-",
            type: bet.type ?? "-",

            resultStatus: "WIN",
          });
        }
      });
    }

    // SORT BY DATE DESC (UNCHANGED)
    allWinRows.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const totalRecords = allWinRows.length;
    const totalPages = Math.ceil(totalRecords / limit);
    const start = (page - 1) * limit;

    const paginatedData =
      limit === 9999 ? allWinRows : allWinRows.slice(start, start + limit);

    // RENDER (UNCHANGED)
    res.render("User/userWinHistory", {
      user,
      winHistory: paginatedData,
      page,
      limit,
      totalPages,
      totalRecords,
      source: source || "",
      startDate: startDate || "",
      endDate: endDate || "",
      mainGame: mainGame || "",
      gameName: gameName || "",
    });
  } catch (err) {
    console.error("WIN HISTORY ERROR:", err);
    next(err);
  }
};

exports.getUserBidHistory = async (req, res, next) => {
  try {
    if (!req.session.isLoggedIn || req.session.user.role !== "user") {
      return res.redirect("/login");
    }

    const user = await User.findOne({
      _id: req.session.user._id,
      userStatus: "active",
    }).lean();

    if (!user) return res.redirect("/login");

    let allRows = [];

    for (const Model of betModels) {
      const records = await Model.find({ userId: user._id }).lean();

      records.forEach((bet) => {
        if (!Array.isArray(bet.bets)) return;

        bet.bets.forEach((b) => {
          const digits = [];
          const amounts = [];

          /* ================= DIGITS ================= */

          // underNos / underDigits
          if (Array.isArray(b.underNos)) {
            b.underNos.forEach(v => digits.push(v));
          }
          if (Array.isArray(b.underDigits)) {
            b.underDigits.forEach(v => digits.push(v));
          }

          // single underNo
          if (b.underNo !== undefined) digits.push(b.underNo);

          // normal digit fields
          [
            b.number,
            b.openDigit,
            b.closeDigit,
            b.openPanna,
            b.closePanna,
          ].forEach(v => {
            if (v !== undefined && v !== null && v !== "") {
              digits.push(v);
            }
          });

          /* ================= AMOUNTS ================= */

          if (b.perUnderNosPoints !== undefined)
            amounts.push(Number(b.perUnderNosPoints));

          if (b.amountPerUnderNo !== undefined)
            amounts.push(Number(b.amountPerUnderNo));

          if (b.amount !== undefined)
            amounts.push(Number(b.amount));

          if (b.totalAmount !== undefined)
            amounts.push(Number(b.totalAmount));

          if (b.totalPoints !== undefined)
            amounts.push(Number(b.totalPoints));

          const marketMap = {
            MAIN_GAME: "Main Market",
            STARLINE: "Starline",
            JACKPOT: "Jackpot",
          };

          allRows.push({
            gameType: bet.gameType ?? "-",
            mainGame: marketMap[bet.mainGame] || bet.mainGame || "-",
            rawMainGame: bet.mainGame || "ALL", // 👈 filter ke kaam aayega
            gameName: bet.gameName ?? "-",
            session: b.mode ?? b.session ?? "-",
            mainNo: b.mainNo ?? null,
            digits,
            amounts,
            resultStatus: b.resultStatus ?? "PENDING",
            createdAt: bet.createdAt,
          });
        });
      });
    }
    allRows.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.render("User/userBidHistory", {
      user,
      winHistory: allRows,
    });

  } catch (err) {
    console.error(err);
    next(err);
  }
};