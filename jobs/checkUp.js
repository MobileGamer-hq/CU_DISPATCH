const cron = require("node-cron");
const admin = require("../utilities/firebase");

module.exports = function (bot, appInstance) {
    // Heartbeat
    cron.schedule("* * * * *", () => {
        console.log("🕐 Cron heartbeat:", new Date().toString());
    });
}