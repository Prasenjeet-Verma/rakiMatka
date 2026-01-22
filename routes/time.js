const express = require("express");
const router = express.Router();
const moment = require("moment-timezone");

router.get("/server-time", (req, res) => {
  const now = moment().tz("Asia/Kolkata");

  res.json({
    success: true,
    time: now.format("HH:mm"),      // 24-hour format
    date: now.format("YYYY-MM-DD"), // date
    weekday: now.format("dddd")     // Monday, Tuesday
  });
});

module.exports = router;
