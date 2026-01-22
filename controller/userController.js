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

    // 🇮🇳 Indian Time
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
    const currentMinutes = now.hours() * 60 + now.minutes();

    const games = await Game.find({ isDeleted: false }).lean();

    // 🔥 COMMON FORMATTER
    const processedGames = games
      .filter((game) => {
        const d = game.schedule?.[todayKey];
        return d && d.isActive && d.openTime && d.closeTime;
      })
      .map((game) => {
        const d = game.schedule[todayKey];

        // Parse the original admin times
        const [oh, om] = d.openTime.split(":").map(Number); // for display
        const [ch, cm] = d.closeTime.split(":").map(Number);

        const closeMinutes = ch * 60 + cm;
        const currentMinutes = now.hours() * 60 + now.minutes();

        // ✅ Open automatically at 12:00 AM, ignore admin openTime for running
        const isRunning = currentMinutes >= 0 && currentMinutes <= closeMinutes;

        return {
          _id: game._id,
          gameName: game.gameName,
          openTime: moment(d.openTime, "HH:mm").format("hh:mm A"), // Show admin openTime
          closeTime: moment(d.closeTime, "HH:mm").format("hh:mm A"),
          isRunning,
          statusText: isRunning ? "Market Running" : "Market Closed",
          isStarline: game.isStarline || false,
          isJackpot: game.isJackpot || false,
        };
      });

    // ===================== 🎯 SEPARATION =====================
    const normalGames = processedGames.filter(
      (g) => !g.isStarline && !g.isJackpot,
    );

    const starlineGames = processedGames.filter((g) => g.isStarline);

    const jackpotGames = processedGames.filter((g) => g.isJackpot);

    // ===================== TRANSACTIONS =====================
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

    // ===================== RENDER =====================
    res.render("User/userDashboard", {
      user,
      admin,

      normalGames, // ✅ NORMAL
      starlineGames, // ⭐ STARLINE
      jackpotGames, // 💰 JACKPOT

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

exports.getPlayGamePage = async (req, res, next) => {
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

    const gameId = req.params.id;

    const game = await Game.findById(gameId);
    if (!game) {
      return res.status(404).send("Game not found");
    }

    res.render("User/userMainGame", {
      game,
      admin,
      user,
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
  let user;

  try {
    if (
      !req.session.isLoggedIn ||
      !req.session.user ||
      req.session.user.role !== "user"
    ) {
      return res.redirect("/login");
    }

    user = await User.findOne({
      _id: req.session.user._id,
      role: "user",
      userStatus: "active",
    });

    if (!user) {
      req.session.destroy();
      return res.redirect("/login");
    }

    // Optional: admin info (for header/support)
    const admin = await User.findOne({ role: "admin" }).select(
      "username phoneNo profilePhoto",
    );
    const { gameId, gameName, betType, bets } = req.body;

    if (!gameId || !betType || !Array.isArray(bets) || bets.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid bet data",
      });
    }

    if (!["open", "close"].includes(betType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid bet type",
      });
    }

    let calculatedTotal = 0;

    for (const bet of bets) {
      if (
        typeof bet.number !== "number" ||
        bet.number < 0 ||
        bet.number > 9 ||
        typeof bet.amount !== "number" ||
        bet.amount <= 0
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid bet numbers or amount",
        });
      }
      calculatedTotal += bet.amount;
    }

    const game = await Game.findById(gameId);
    if (!game || game.isDeleted || game.isJackpot) {
      return res.status(400).json({
        success: false,
        message: "Invalid game selected",
      });
    }

    if (user.wallet < calculatedTotal) {
      return res.status(400).json({
        success: false,
        message: "Insufficient wallet balance",
      });
    }

    const now = moment().tz("Asia/Kolkata");

    user.wallet -= calculatedTotal;
    await user.save();

    const betDoc = new SingleDigitBet({
      userId: user._id,
      gameId,
      gameName: game.gameName || gameName,
      betType,
      bets,
      totalAmount: calculatedTotal,
      playedDate: now.format("YYYY-MM-DD"),
      playedTime: now.format("HH:mm"),
      playedWeekday: now.format("dddd"),
    });

    await betDoc.save();

    return res.json({
      success: true,
      message: `Bet placed successfully! ₹${calculatedTotal} deducted`,
      wallet: user.wallet,
    });
  } catch (err) {
    console.error("❌ SINGLE DIGIT BET ERROR:", err);

    if (user && req.body?.bets) {
      const refund = req.body.bets.reduce(
        (s, b) => s + (Number(b.amount) || 0),
        0,
      );
      user.wallet += refund;
      await user.save();
    }

    return res.status(500).json({
      success: false,
      message: "Something went wrong",
    });
  }
};

/* ================= PLACE SINGLE BULK DIGIT BET ================= */
exports.placeSingleBulkDigitBet = async (req, res) => {
  let user;

  try {
    /* ========== AUTH CHECK ========== */
    if (
      !req.session.isLoggedIn ||
      !req.session.user ||
      req.session.user.role !== "user"
    ) {
      return res.redirect("/login");
    }

    user = await User.findOne({
      _id: req.session.user._id,
      role: "user",
      userStatus: "active",
    });

    if (!user) {
      req.session.destroy();
      return res.redirect("/login");
    }

    // Optional: admin info (for header/support)
    const admin = await User.findOne({ role: "admin" }).select(
      "username phoneNo profilePhoto",
    );

    /* ========== BODY DATA ========== */
    const { gameId, gameName, session, bets } = req.body;

    if (!gameId || !session || !Array.isArray(bets) || bets.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid bet data",
      });
    }

    if (!["OPEN", "CLOSE"].includes(session)) {
      return res.status(400).json({
        success: false,
        message: "Invalid session selected",
      });
    }

    /* ========== BET VALIDATION ========== */
    let calculatedTotal = 0;

    for (const bet of bets) {
      if (
        typeof bet.number !== "number" ||
        bet.number < 0 ||
        bet.number > 9 ||
        typeof bet.amount !== "number" ||
        bet.amount <= 0
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid digit or amount",
        });
      }

      calculatedTotal += bet.amount;
    }

    /* ========== GAME CHECK ========== */
    const game = await Game.findById(gameId);
    if (!game || game.isDeleted || game.isJackpot) {
      return res.status(400).json({
        success: false,
        message: "Invalid game selected",
      });
    }

    /* ========== WALLET CHECK ========== */
    if (user.wallet < calculatedTotal) {
      return res.status(400).json({
        success: false,
        message: "Insufficient wallet balance",
      });
    }

    /* ========== TIME (INDIA) ========== */
    const now = moment().tz("Asia/Kolkata");

    /* ========== DEDUCT WALLET ========== */
    user.wallet -= calculatedTotal;
    await user.save();

    /* ========== SAVE BET ========== */
    const betDoc = new SingleBulkDigitBet({
      userId: user._id,
      gameId,
      gameName: game.gameName || gameName,
      session,
      bets,
      totalAmount: calculatedTotal,
      playedDate: now.format("YYYY-MM-DD"),
      playedTime: now.format("HH:mm"),
      playedWeekday: now.format("dddd"),
    });

    await betDoc.save();

    return res.json({
      success: true,
      message: `Single Bulk Digit bet placed! ₹${calculatedTotal} deducted`,
      wallet: user.wallet,
    });
  } catch (err) {
    console.error("❌ SINGLE BULK DIGIT ERROR:", err);

    /* ========== REFUND SAFETY ========== */
    if (user && Array.isArray(req.body?.bets)) {
      const refund = req.body.bets.reduce(
        (s, b) => s + (Number(b.amount) || 0),
        0,
      );
      user.wallet += refund;
      await user.save();
    }

    return res.status(500).json({
      success: false,
      message: "Something went wrong",
    });
  }
};

/* ================= PLACE JODI DIGIT BET ================= */
exports.placeJodiDigitBet = async (req, res) => {
  let user;
  try {
    if (!req.session.isLoggedIn || !req.session.user || req.session.user.role !== "user") {
      return res.redirect("/login");
    }

    user = await User.findOne({ _id: req.session.user._id, role: "user", userStatus: "active" });
    if (!user) {
      req.session.destroy();
      return res.redirect("/login");
    }

    const { gameId, gameName, bets } = req.body;
    if (!gameId || !Array.isArray(bets) || bets.length === 0) {
      return res.status(400).json({ success: false, message: "Invalid bet data" });
    }

    let totalAmount = 0;
    for (const bet of bets) {
      if (
        typeof bet.mainNo !== "number" || bet.mainNo < 0 || bet.mainNo > 9 ||
        !bet.underNo || !/^[0-9]{2}$/.test(bet.underNo) ||
        typeof bet.amount !== "number" || bet.amount <= 0
      ) {
        return res.status(400).json({ success: false, message: "Invalid bet" });
      }
      totalAmount += bet.amount;
    }

    const game = await Game.findById(gameId);
    if (!game || game.isDeleted) {
      return res.status(400).json({ success: false, message: "Invalid game" });
    }

    if (user.wallet < totalAmount) {
      return res.status(400).json({ success: false, message: "Insufficient balance" });
    }

    const now = moment().tz("Asia/Kolkata");
    user.wallet -= totalAmount;
    await user.save();

    const betDoc = new JodiDigitBet({
      userId: user._id,
      gameId,
      gameName: game.gameName || gameName,
      bets,
      totalAmount,
      playedDate: now.format("YYYY-MM-DD"),
      playedTime: now.format("HH:mm"),
      playedWeekday: now.format("dddd")
    });

    await betDoc.save();

    res.json({ success: true, message: `Jodi Digit bet placed ₹${totalAmount}`, wallet: user.wallet });

  } catch (err) {
    console.error("❌ JODI DIGIT ERROR:", err);
    if (user) {
      user.wallet += req.body?.bets?.reduce((s, b) => s + (b.amount || 0), 0);
      await user.save();
    }
    res.status(500).json({ success: false, message: "Server error" });
  }
};
