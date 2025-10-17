const admin = require("../utilities/firebase");
const { sendMessage } = require("../utilities/messages");

// Escape MarkdownV2 special characters for Telegram
function escapeMarkdown(text) {
    return text.replace(/([_*[\]()~`>#+\-=|{}.!\\])/g, "\\$1");
}

module.exports = (bot, app) => {
    bot.onText(/\/help/, async (msg) => {
        const chatId = msg.chat.id;

        try {
            const snapshot = await admin.database().ref("admins").once("value");
            const adminList = snapshot.val() || {};
            const isAdmin = adminList[chatId];
            console.log(`Is The User An Admin: ${isAdmin}`);

            if (isAdmin) {
                const adminHelp = `
👋 *Welcome, Admin!*

🔧 *Admin Commands*

📊 *User Management*  
• /users – View total number of users  
• /view_users – View all registered users  
• /find – Find a user by their Matric number  
• /verify_user <userId> – Verify a single user’s matric number and level  
• /verify_users – Verify all users and detect invalid records  
• /warn_user <userId> – Send a warning message to a user with invalid data  
• /purge_user <userId> – Remove a user from the database  

📢 *Messaging*  
• /send_message – Send a message to all users  
• /send_announcement – Broadcast an announcement  

📅 *Events & Scheduling*  
• /add_event – Add a new event to the calendar  
• /view_events – List all upcoming events  
• /upload_timetable – Upload class timetable  

📂 *General Data*  
• /upload – Upload a document or resource  
• /add – Add general data  
• /update – Update general data  
• /update_contact – Update a single contact  
• /update_contacts – Update all contacts  

📚 *FAQ Management*  
• /add_faq – Add a new FAQ entry  

🧠 *Tips*  
Admin commands help you manage users, events, FAQs, and communication efficiently.
`;

                await bot.sendMessage(chatId, (adminHelp), {
                    parse_mode: "MarkdownV2",
                });
            } else {
                const studentHelp = `
👋 *Welcome to the Covenant University Student Council Bot!*

📚 *Personal Info*  
• /start – Register or initialize your session  
• /help – View available commands  
• /view_info – Check your registered information  

✉️ *Contact*  
• /contact – Message the Student Council (can be anonymous)  
• /contacts – Get school office contact details  

📅 *Events*  
• /events – See upcoming CU events  
• /announcements – View latest updates  
• /timetable – View your semester timetable  
• /semester_events – See semester events  
• /monthly_events – See monthly events  

💡 *Suggestions & Feedback*  
• /suggest – Send ideas or feedback  
• /faq – View answers to common questions  

🔍 *Lost and Found*  
• /submit_lost_and_found – Report a lost or found item (with image)  
• /lost_and_found – View all posted items  

ℹ️ *Note:* Student commands let you view and manage your info, events, and reports.
`;

                await sendMessage(chatId, escapeMarkdown(studentHelp), {
                    parse_mode: "MarkdownV2",
                });
            }
        } catch (error) {
            console.error("Error fetching admin data:", error);
            bot.sendMessage(
                chatId,
                "❌ Sorry, there was an issue fetching the admin data."
            );
        }
    });
};
