// const mongoose = require("mongoose");
// const bcrypt = require("bcrypt");
// const User = require("./model/userSchema"); // path check karo

// mongoose.connect(
//   "mongodb+srv://root:root@prasenjeet.arcnqj5.mongodb.net/ravimatka"
// ).then(() => console.log("MongoDB connected"))
//  .catch(err => console.error("MongoDB connection error:", err));

// async function resetPassword() {
//   try {
//     const admin = await User.findOne({ username: "Admin" });
//     if (!admin) return console.log("Admin not found");

//     const newPassword = "123456"; // naya password
//     const hash = await bcrypt.hash(newPassword, 10);

//     admin.password = hash;
//     await admin.save();

//     console.log("Admin password reset successfully!");
//     process.exit(0);
//   } catch (err) {
//     console.error(err);
//     process.exit(1);
//   }
// }

// resetPassword();