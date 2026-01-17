const moment = require("moment-timezone");

exports.isGameOpenNow = (game) => {
  const now = moment().tz("Asia/Kolkata");
  const today = now.format("dddd").toLowerCase();

  const todaySchedule = game.schedule[today];
  if (!todaySchedule) return false;

  if (!todaySchedule.isActive) return false;

  return now.isBetween(
    moment(todaySchedule.openTime, "HH:mm"),
    moment(todaySchedule.closeTime, "HH:mm")
  );
};
