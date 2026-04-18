// jobs/weeklyEvents.js
const cron = require("node-cron");
const moment = require("moment");
const fs = require("fs");
const path = require("path");
const { sendMessageToAll } = require("../utilities/messages");

module.exports = function (bot, appInstance) {
    // Schedule for every Sunday at 8:00 AM
    cron.schedule("0 8 * * 0", async () => {
        console.log("📅 Weekly events cron triggered...");

        try {
            // Load events data
            const eventsPath = path.join(__dirname, "../data/events.json");
            const data = JSON.parse(fs.readFileSync(eventsPath, "utf8"));

            // Reference date for Week 1: March 22, 2026
            const referenceDate = moment("2026-03-22");
            const currentDate = moment();
            
            // Calculate current week number
            const weeksPassed = Math.floor(currentDate.diff(referenceDate, 'weeks')) + 1;
            const currentWeekStr = weeksPassed.toString();

            console.log(`🔍 Filtering events for Week ${currentWeekStr}...`);

            // Filter events for this week
            const weeklyEvents = data.events.filter(event => {
                if (!event.week || event.week === "---") return false;

                // Handle multiple entries (e.g., "5, 6, 7") or ranges (e.g., "19 - 24")
                const weekParts = event.week.split(",").map(p => p.trim());
                return weekParts.some(part => {
                    if (part.includes("-")) {
                        const [start, end] = part.split("-").map(n => parseInt(n.trim()));
                        return weeksPassed >= start && weeksPassed <= end;
                    } else {
                        return part === currentWeekStr;
                    }
                });
            });

            if (weeklyEvents.length === 0) {
                console.log(`ℹ️ No events found for Week ${currentWeekStr}.`);
                return;
            }

            // Format message
            let message = `📅 *Events for Week ${currentWeekStr}*\n`;
            message += `_${data.semester} Semester, ${data.session}_\n\n`;

            weeklyEvents.forEach((event, index) => {
                message += `${index + 1}. *${event.activity}*\n`;
                message += `   🗓 Date: ${event.date}\n`;
                if (event.note) {
                    message += `   📝 Note: ${event.note}\n`;
                }
                message += `\n`;
            });

            message += `📌 *Notes:*\n`;
            data.notes.forEach(note => {
                message += `• ${note}\n`;
            });

            // Send to all users
            await sendMessageToAll(bot, message);
            console.log(`✅ Weekly events broadcast complete for Week ${currentWeekStr}.`);

        } catch (error) {
            console.error("❌ Error in weekly events job:", error.message);
        }
    });
};
