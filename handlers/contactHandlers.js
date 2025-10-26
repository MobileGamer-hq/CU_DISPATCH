const admin = require("../utilities/firebase");
const {sendMessage} = require("../utilities/messages");

module.exports = (bot, app) => {
    const contactSessions = {}; // 🔹 Store user sessions for /contact flow

    // 🟢 Step 1: Command to start contact message
    bot.onText(/\/contact$/, async (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;

        contactSessions[userId] = {step: "awaiting_message"};

        await bot.sendMessage(
            chatId,
            `📬 *Contact Management*\n\nYou can send a message to school officials. This message can be sent anonymously or with your details (name & matric number).\n\nPlease type your message below:`,
            {parse_mode: "Markdown"}
        );
    });

    // 🟡 Step 2: Handle user message after /contact
    bot.on("message", async (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;

        // Ignore commands or unrelated messages
        if (!msg.text || msg.text.startsWith("/contact")) return;

        const session = contactSessions[userId];
        if (session?.step !== "awaiting_message") return;

        // Save the user's message
        contactSessions[userId].message = msg.text;
        contactSessions[userId].step = "awaiting_identity_choice";

        await bot.sendMessage(
            chatId,
            `🕵️‍♂️ Would you like to send this message anonymously or with your name and matric number?`,
            {
                reply_markup: {
                    inline_keyboard: [
                        [
                            {text: "✅ Send Anonymously", callback_data: "send_anonymous"},
                            {text: "👤 Attach My Info", callback_data: "send_with_info"},
                        ],
                    ],
                },
            }
        );
    });

    // 🔵 Step 3: Handle user’s choice (anonymous or with info)
    bot.on("callback_query", async (query) => {
        const userId = query.from.id;
        const chatId = query.message.chat.id;
        const data = query.data;
        const session = contactSessions[userId];

        if (!session || session.step !== "awaiting_identity_choice") return;

        try {
            const db = admin.database();
            const userSnapshot = await db.ref(`users/${userId}`).once("value");
            const userData = userSnapshot.val() || {};

            let finalMessage = "";

            if (data === "send_anonymous") {
                finalMessage = `📩 *Anonymous Message Received:*\n\n${session.message}`;
            } else if (data === "send_with_info") {
                finalMessage = `📩 *Message From ${userData.first_name || "Unknown"} ${
                    userData.last_name || ""
                }*\n*Matric Number:* ${userData.matric_number || "Unknown"}\n\n${session.message}`;
            } else {
                return bot.answerCallbackQuery(query.id, {text: "Invalid option.", show_alert: true});
            }

            // Fetch admins
            const adminSnapshot = await db.ref("admins").once("value");
            const adminList = adminSnapshot.val() || {};

            //Send message to all admins
            for (const adminId in adminList) {
                try {
                    await bot.sendMessage(adminId, finalMessage, {parse_mode: "Markdown"});
                } catch (e) {
                    console.error(e)
                }
            }


            // Notify user
            await bot.sendMessage(chatId, "✅ Your message has been sent. Thank you!");

            // Cleanup
            delete contactSessions[userId];
            await bot.answerCallbackQuery(query.id);
        } catch (error) {
            console.error("🔥 Error sending contact message:", error);
            await bot.sendMessage(chatId, "❌ Failed to send your message. Please try again later.");
            await bot.answerCallbackQuery(query.id);
        }
    });


//Done
    bot.onText(/\/contacts/, async (msg) => {
        const contactInfo = `
📬 *Covenant University Contact Directory*


1️⃣ *Attendance Issues*
• Biometrics Office – Chapel, 2nd Floor  
• Dean, Student Affairs  
✉️ attendance-sa@covenantuniversity.edu.ng  
✉️ dsa@covenantuniversity.edu.ng

2️⃣ *Hall of Residence Issues*
• Residency Administrator – Lydia Hall, 1st Floor  
• Dean, Student Affairs  
✉️ residency-sa@covenantuniversity.edu.ng  
✉️ dsa@covenantuniversity.edu.ng

3️⃣ *Hall Facilities Issues*
• Facilities Officer – Lydia Hall, 2nd Floor

4️⃣ *Exeat Matters*
• Dean, Student Affairs – Lydia Hall, 2nd Floor  
✉️ dsa@covenantuniversity.edu.ng

5️⃣ *Financial Issues*
• School Fees, Refunds, Others  
✉️ dfs@covenantuniversity.edu.ng

6️⃣ *Medical / Special Care Needs*
• Head of Welfare & Quality Control  
• CUSC Welfare Officer – Chapel & Student Council Offices  
✉️ welfaresecf.cusc@covenantuniversity.edu.ng

7️⃣ *Food/Café Issues*
• Café Manager  
• Welfare Office  
• CUSC Welfare Officer  
✉️ welfaresecf.cusc@covenantuniversity.edu.ng

8️⃣ *Academic Progression / Performance*
✉️ academicaffairs@covenantuniversity.edu.ng

9️⃣ *Postgraduate Issues*
✉️ deansps@covenantuniversity.edu.ng

🔟 *Spiritual / Counseling Issues*
• Chaplain, Associate Chaplain  
• Student Chaplaincy Office  
✉️ cu.studentchaplaincy@gmail.com

1️⃣1️⃣ *Portal / Registration / Login Issues*
• CSIS Office – CMSS, 2nd Floor  
• ICT – Zenith Bank  
✉️ dcsis@covenantuniversity.edu.ng

1️⃣2️⃣ *Follow-Up on Issues*
• CUSC Chairman  
• Student Council Office  
✉️ chairman.cusc@covenantuniversity.edu.ng
`;


        await sendMessage(bot, msg.chat.id, contactInfo, {parse_mode: "Markdown"});
    });
};