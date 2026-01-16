const bcrypt = require("bcryptjs");
const User = require("../model/userSchema");
const WalletTransaction = require("../model/WalletTransaction");
const UserBankDetails = require("../model/UserBankDetails");

exports.UserHomePage = async (req, res, next) => {
  try {
    // This will be either the user object or undefined
    const user = req.session.user || null;

    // isLoggedIn will be true or false
    const isLoggedIn = !!req.session.isLoggedIn;

    // Render your home page and pass the session info
    res.render("User/UserHomePage", {
      user: user,
      isLoggedIn: false
    });
  } catch (err) {
    console.error("Error in UserHomePage:", err);
    next(err); // pass error to Express error handler
  }
};


exports.getUserDashboardPage = async (req, res, next) => {
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
      userStatus: "active"
    }).select("-password");

    if (!user) {
      req.session.destroy();
      return res.redirect("/login");
    }

    // Optional: admin info (for header/support)
    const admin = await User.findOne({ role: "admin" }).select(
      "username phoneNo profilePhoto"
    );

    res.render("User/userDashboard", {
      user,
      admin,
      isLoggedIn: req.session.isLoggedIn
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
      userStatus: "active"
    }).select("-password");

    if (!user) {
      req.session.destroy();
      return res.redirect("/login");
    }

    // Optional: admin info (for header/support)
    const admin = await User.findOne({ role: "admin" }).select(
      "username phoneNo profilePhoto"
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
      isLoggedIn: req.session.isLoggedIn
    });

  } catch (err) {
    console.error("userProfile Error:", err);
    next(err);
  }
}

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
      "username phoneNo profilePhoto"
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
        message: "All fields are required"
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
        message: "Bank details updated successfully"
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
        message: "Bank details added successfully"
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
      userStatus: "active"
    }).select("-password");

    if (!user) {
      req.session.destroy();
      return res.redirect("/login");
    }

    // Optional: admin info (for header/support)
    const admin = await User.findOne({ role: "admin" }).select(
      "username phoneNo profilePhoto"
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
      isLoggedIn: req.session.isLoggedIn
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
      userStatus: "active"
    }).select("-password");

    if (!user) {
      req.session.destroy();
      return res.redirect("/login");
    }

    // Optional: admin info (for header/support)
    const admin = await User.findOne({ role: "admin" }).select(
      "username phoneNo profilePhoto"
    );

    res.render("User/userContactUs", {
      user,
      admin,
      isLoggedIn: req.session.isLoggedIn
    });

  } catch (err) {
    console.error("userContactAdmin Error:", err);
    next(err);
  }
}

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
      userStatus: "active"
    }).select("-password");

    if (!user) {
      req.session.destroy();
      return res.redirect("/login");
    }

    // Optional: admin info (for header/support)
    const admin = await User.findOne({ role: "admin" }).select(
      "username phoneNo profilePhoto"
    );

    res.render("User/userGameRates", {
      user,
      admin,
      isLoggedIn: req.session.isLoggedIn
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
      userStatus: "active"
    }).select("-password");

    if (!user) {
      req.session.destroy();
      return res.redirect("/login");
    }

    // Optional: admin info (for header/support)
    const admin = await User.findOne({ role: "admin" }).select(
      "username phoneNo profilePhoto"
    );

    res.render("User/userLanguage", {
      user,
      admin,
      isLoggedIn: req.session.isLoggedIn
    });

  } catch (err) {
    console.error("userLanguage Error:", err);
    next(err);
  }
}



