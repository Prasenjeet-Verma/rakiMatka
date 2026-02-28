require("dotenv").config();
console.log("DEBUG ENV:", process.env.MONGO_URI);
const express = require("express");
const path = require("path");
const mongoose = require("mongoose");
const session = require("express-session");
const MongoDBStore = require("connect-mongodb-session")(session);
require("dotenv").config(); // <-- load .env variables

// Import routes
const rootDir = require("./utils/pathUtils");
const loginAndSignupRouter = require("./routes/loginAndSignupRouter");
const userRouter = require("./routes/userRouter");
const adminRouter = require("./routes/adminRouter");
const timeRouter = require("./routes/time");
// ---------------- EXPRESS APP ----------------
const app = express();
app.set("view engine", "ejs");
app.set("views", "views");

// ---------------- SESSION STORE ----------------
const store = new MongoDBStore({
  uri: process.env.MONGO_URI, // from .env
  collection: "sessions",
});
store.on("error", console.log);

// app.use(
//   session({
//     secret: process.env.SESSION_SECRET || "mysecret", // from .env
//     resave: false,
//     saveUninitialized: false,
//     store: store,
//   })
// );


app.use(
  session({
    secret: process.env.SESSION_SECRET || "mysecret",
    resave: false,
    saveUninitialized: false,
    store: store,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
      httpOnly: true, // prevents JS access to cookie
      secure: false, // change to true if using HTTPS
    },
  })
);
// ---------------- PARSERS ----------------
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Prevent browser caching of pages like login
app.use((req, res, next) => {
  res.set(
    "Cache-Control",
    "no-cache, no-store, must-revalidate, private"
  );
  res.set("Pragma", "no-cache");
  res.set("Expires", "0");
  next();
});

// ---------------- CUSTOM MIDDLEWARE ----------------
app.use((req, res, next) => {
  req.isLoggedIn = req.session.isLoggedIn;
  next();
});


// ---------------- STATIC ----------------
app.use(express.static(path.join(rootDir, "public")));
// 🔥 SERVER TIME API (GLOBAL)
app.use("/", timeRouter);
// ---------------- ROUTES ----------------
app.use(loginAndSignupRouter);
app.use(userRouter);
app.use(adminRouter);

// ---------------- ERROR HANDLING ---------------- <--- isko bhi krna h important
// 404 Page
// app.use((req, res, next) => {
//   res.status(404).render("404", { isLoggedIn: req.session.isLoggedIn });
// });

// ---------------- DATABASE + SERVER ----------------
const PORT = process.env.PORT || 3000;

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    app.listen(PORT, () => {
      console.log(`✅ Server running on port ${PORT}`);
      console.log(`Visit: http://localhost:${PORT}/`);
    });
  })
  .catch((err) => console.log("❌ Database connection error:", err));

