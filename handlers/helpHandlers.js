const admin = require("../utilities/firebase");
const { sendMessage } = require("../utilities/messages");
const { userCommands, adminCommands } = require("../data/commands");

const studentHelp = `
👋 *Welcome to CU Dispatch!*
Here are all the commands available for students:

📚 *Personal Info & Profile*
• /start – Register or initialize your session
• /help – View available commands and features
• /view_info – Check your registered information
• /update_info – Update your profile details (Name, Matric, Level)

✉️ *Contact & Support*
• /contact – Message the Student Council (anonymous or with details)
• /contacts – Contact directory for school offices
• /faq – Frequently Asked Questions & Answers

📢 *Updates, Events & Schedules*
• /announcements – View latest updates from Student Council
• /weekly_events – See upcoming CU events for this week
• /monthly_events – See upcoming CU events for this month
• /timetable – View academic, semester, and exam timetables
• /handbook – Download the official student handbook

🏢 *Campus Business Directory*
• /directory – Browse campus business catalog & top rated services
• /register_business – Register your business in the directory
• /my_business – View and manage your registered business
• /search_business \`<query>\` – Search businesses by tag or keyword

🔍 *Lost & Found*
• /submit_lost_and_found – Report a lost or found item (photo & description)
• /lost_and_found – View all posted lost and found items

✨ *Extras*
• /encourage – Receive an encouraging message for your day
• /about – Learn more about CU Dispatch & its creator
`;

const adminHelp = `
👋 *Welcome, Admin!*
You have access to admin management, broadcasting, and verification commands:

📊 *User Analytics & Lookup*
• /users – View total user count & level statistics
• /view_users – List all registered users with details
• /find \`<matric>\` – Find a user by Matric number

🏢 *Business Directory Admin*
• /admin_businesses – View directory stats & total counts
• /ban_business \`<id>\` – Ban a business listing by ID
• /unban_business \`<id>\` – Unban a business listing by ID

⚙️ *User Verification & Management*
• /add_admin \`<matric>\` – Make a user an admin by Matric number
• /remove_user \`<matric>\` – Delete user from database by Matric
• /verify_user \`<userId>\` – Verify single user's details & check issues
• /verify_users – Scan all database users for invalid records
• /warn_user \`<userId>\` – Send warning message to user with bad data
• /purge_user \`<userId>\` – Purge an invalid user record

📢 *Broadcasting & Content Management*
• /send_message – Broadcast a message or photo to all users
• /add_faq – Add a new FAQ entry to the database

👑 *Owner Commands*
• /backup – Backup Realtime Database
• /get_backup – View backup count & statistics
• /clear_chats – Clean up bot message logs

💡 *Note:* You also have access to all student commands! Type /help_student or tap below to view them.
`;

module.exports = (bot, app) => {
    bot.onText(/\/help$/, async (msg) => {
        const chatId = msg.chat.id;

        try {
            const snapshot = await admin.database().ref("admins").once("value");
            const adminList = snapshot.val() || {};
            const isAdmin = !!adminList[chatId];

            if (isAdmin) {
                await bot.setMyCommands([...adminCommands, ...userCommands]).catch(() => {});
                await sendMessage(bot, chatId, adminHelp, {
                    parse_mode: "Markdown",
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: "📚 View Student Commands", callback_data: "help:student" }]
                        ]
                    }
                });
            } else {
                await bot.setMyCommands(userCommands).catch(() => {});
                await sendMessage(bot, chatId, studentHelp, { parse_mode: "Markdown" });
            }
        } catch (error) {
            console.error("Error in /help handler:", error);
            await sendMessage(bot, chatId, studentHelp, { parse_mode: "Markdown" });
        }
    });

    bot.onText(/\/help_student$/, async (msg) => {
        const chatId = msg.chat.id;
        await sendMessage(bot, chatId, studentHelp, { parse_mode: "Markdown" });
    });

    bot.on("callback_query", async (query) => {
        if (query.data === "help:student") {
            const chatId = query.message.chat.id;
            await sendMessage(bot, chatId, studentHelp, { parse_mode: "Markdown" });
            await bot.answerCallbackQuery(query.id).catch(() => {});
        }
    });
};
