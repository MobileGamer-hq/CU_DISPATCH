const {
    saveBusiness,
    getBusiness,
    getUserBusiness,
    getAllBusinesses,
    searchBusinesses,
    getBusinessesByCategory,
    getTopRatedBusinesses,
    rateBusiness,
    banBusiness,
    unbanBusiness,
    deleteBusiness,
    getBusinessStats,
    isUserAdmin,
    notifyAdmins
} = require("../utilities/database");

// Temporary session storage for conversational registration & search steps
const registrationSessions = {};
const searchSessions = {};

// Categories list
const CATEGORIES = [
    { label: "🍔 Food & Drinks", id: "food" },
    { label: "💇 Beauty & Fashion", id: "beauty" },
    { label: "💻 Tech & Gadgets", id: "tech" },
    { label: "🖨️ Printing & Logistics", id: "printing" },
    { label: "🎨 Design & Crafts", id: "design" },
    { label: "📚 Tutors & Academics", id: "academics" },
    { label: "📦 Services & General", id: "general" }
];

module.exports = (bot, app) => {

    // ========== HELPER FUNCTIONS ==========

    // Build main directory inline menu
    async function getDirectoryMenuKeyboard(userId) {
        const adminStatus = await isUserAdmin(userId);
        const buttons = [
            [{ text: "🏆 Top Rated Businesses", callback_data: "biz_menu_top" }, { text: "🔍 Browse Categories", callback_data: "biz_menu_categories" }],
            [{ text: "🆕 Recently Added", callback_data: "biz_menu_recent" }, { text: "🔎 Quick Search", callback_data: "biz_menu_search" }],
            [{ text: "➕ Register My Business", callback_data: "biz_menu_register" }, { text: "💼 My Business", callback_data: "biz_menu_mine" }]
        ];

        if (adminStatus || userId === 6311922657) {
            buttons.push([{ text: "⚙️ Admin Business Hub", callback_data: "biz_admin_hub" }]);
        }

        return { inline_keyboard: buttons };
    }

    // Format single business profile card
    function formatBusinessCard(b) {
        const ratingStars = b.totalRatings > 0 ? "⭐".repeat(Math.round(b.averageRating || 0)) : "⭐ (No ratings yet)";
        const ratingText = b.totalRatings > 0 ? `${b.averageRating} / 5.0 (${b.totalRatings} review${b.totalRatings > 1 ? 's' : ''})` : "Not rated yet";
        const tagsFormatted = (b.tags || []).map(t => `#${t.replace(/\s+/g, '')}`).join(" ");
        const ownerDisplay = (b.showOwnerName && b.ownerName) ? `👤 *Owner:* ${b.ownerName}\n` : "";
        const regDate = new Date(b.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

        return `🏢 *${b.name}*\n` +
            `━━━━━━━━━━━━━━━━━━━━\n` +
            `⭐ *Rating:* ${ratingStars} (${ratingText})\n` +
            `📂 *Category:* ${b.category || "General"}\n` +
            `🏷️ *Tags:* ${tagsFormatted || "#campus"}\n` +
            `📝 *Description:* ${b.description || "No description provided."}\n` +
            `${ownerDisplay}` +
            `📅 *Registered:* ${regDate}\n` +
            `🆔 *ID:* \`${b.id}\``;
    }

    // Format business card inline actions (Link, Rate)
    function getBusinessActionButtons(b, isOwner = false) {
        const rows = [];
        const actionRow = [];

        if (b.link) {
            actionRow.push({ text: "🔗 Open Link / Contact", url: b.link });
        }
        actionRow.push({ text: "⭐ Rate Business", callback_data: `biz_rate_${b.id}` });
        rows.push(actionRow);

        if (isOwner) {
            rows.push([{ text: "✏️ Edit Business", callback_data: "biz_menu_register" }, { text: "🗑️ Delete Business", callback_data: `biz_delete_${b.id}` }]);
        }

        return { inline_keyboard: rows };
    }

    // Paginated list viewer helper
    async function sendBusinessList(chatId, messageId, title, businesses, page = 0, backCallback = "biz_menu_main") {
        if (!businesses || businesses.length === 0) {
            const text = `${title}\n\n⚠️ No businesses found in this section yet.`;
            const keyboard = { inline_keyboard: [[{ text: "⬅️ Back to Directory", callback_data: backCallback }]] };
            if (messageId) {
                return bot.editMessageText(text, { chat_id: chatId, message_id: messageId, parse_mode: "Markdown", reply_markup: keyboard });
            }
            return bot.sendMessage(chatId, text, { parse_mode: "Markdown", reply_markup: keyboard });
        }

        const pageSize = 1;
        const totalPages = Math.ceil(businesses.length / pageSize);
        const currentPage = Math.max(0, Math.min(page, totalPages - 1));
        const biz = businesses[currentPage];

        const cardText = `${title} (Listing ${currentPage + 1} of ${businesses.length})\n\n${formatBusinessCard(biz)}`;

        const navRow = [];
        if (currentPage > 0) {
            navRow.push({ text: "⬅️ Previous", callback_data: `biz_page_${currentPage - 1}` });
        }
        if (currentPage < totalPages - 1) {
            navRow.push({ text: "Next ➡️", callback_data: `biz_page_${currentPage + 1}` });
        }

        const actionKeyboard = getBusinessActionButtons(biz);
        const inlineRows = [...actionKeyboard.inline_keyboard];

        if (navRow.length > 0) {
            inlineRows.push(navRow);
        }
        inlineRows.push([{ text: "🔙 Back to Directory", callback_data: backCallback }]);

        const replyMarkup = { inline_keyboard: inlineRows };

        if (messageId) {
            try {
                return await bot.editMessageText(cardText, { chat_id: chatId, message_id: messageId, parse_mode: "Markdown", reply_markup: replyMarkup });
            } catch (err) {
                // If edit fails (e.g. content identical), fall back to sending new message
            }
        }
        return bot.sendMessage(chatId, cardText, { parse_mode: "Markdown", reply_markup: replyMarkup });
    }

    // Send main directory menu
    async function sendDirectoryMenu(chatId, userId, messageId = null) {
        const text = `🏢 *Campus Business Directory Catalog*\n` +
            `━━━━━━━━━━━━━━━━━━━━\n` +
            `Welcome to the CU Dispatch Business Directory!\n\n` +
            `Discover student services, campus vendors, tech helpers, and tutors. Rate your favorite businesses or list your own enterprise!`;

        const keyboard = await getDirectoryMenuKeyboard(userId);

        if (messageId) {
            try {
                return await bot.editMessageText(text, { chat_id: chatId, message_id: messageId, parse_mode: "Markdown", reply_markup: keyboard });
            } catch (err) {
                // Ignore if unchanged
            }
        }
        return bot.sendMessage(chatId, text, { parse_mode: "Markdown", reply_markup: keyboard });
    }

    // ========== BOT COMMAND LISTENERS ==========

    // Main Directory commands
    bot.onText(/\/(directory|businesses|catalog)/, async (msg) => {
        sendDirectoryMenu(msg.chat.id, msg.from.id);
    });

    // Listen for Main Reply Keyboard Button
    bot.on('message', async (msg) => {
        if (!msg.text) return;
        const text = msg.text.trim();
        if (text === "🏢 Campus Directory" || text === "🏢 Businesses" || text === "🏢 Campus Directory / Businesses") {
            sendDirectoryMenu(msg.chat.id, msg.from.id);
        }
    });

    // Direct registration command
    bot.onText(/\/register_business/, async (msg) => {
        startRegistration(msg.chat.id, msg.from.id);
    });

    // My business command
    bot.onText(/\/my_business/, async (msg) => {
        showMyBusiness(msg.chat.id, msg.from.id);
    });

    // Search command (/search_business <query>)
    bot.onText(/\/search_business(?:\s+(.+))?/, async (msg, match) => {
        const query = match[1]?.trim();
        if (!query) {
            return bot.sendMessage(msg.chat.id, "🔍 Usage: `/search_business <keyword or tag>`\nExample: `/search_business food` or `/search_business printing`", { parse_mode: "Markdown" });
        }
        const results = await searchBusinesses(query);
        sendBusinessList(msg.chat.id, null, `🔎 *Search Results for "${query}"*`, results);
    });

    // Admin commands
    bot.onText(/\/admin_businesses|\/biz_stats/, async (msg) => {
        showAdminHub(msg.chat.id, msg.from.id);
    });

    bot.onText(/\/ban_business (\S+)/, async (msg, match) => {
        const userId = msg.from.id;
        const isAdmin = await isUserAdmin(userId);
        if (!isAdmin && userId !== 6311922657) {
            return bot.sendMessage(msg.chat.id, "❌ Only admins can ban businesses.");
        }
        const bizId = match[1].trim();
        const success = await banBusiness(bizId);
        if (success) {
            bot.sendMessage(msg.chat.id, `✅ Business \`${bizId}\` has been banned.`, { parse_mode: "Markdown" });
            notifyAdmins(`🛑 *ADMIN ACTION:* Business \`${bizId}\` was BANNED by Admin [${userId}](tg://user?id=${userId}).`, bot);
        } else {
            bot.sendMessage(msg.chat.id, `❌ Failed to ban business \`${bizId}\`. Check ID.`, { parse_mode: "Markdown" });
        }
    });

    bot.onText(/\/unban_business (\S+)/, async (msg, match) => {
        const userId = msg.from.id;
        const isAdmin = await isUserAdmin(userId);
        if (!isAdmin && userId !== 6311922657) {
            return bot.sendMessage(msg.chat.id, "❌ Only admins can unban businesses.");
        }
        const bizId = match[1].trim();
        const success = await unbanBusiness(bizId);
        if (success) {
            bot.sendMessage(msg.chat.id, `✅ Business \`${bizId}\` has been unbanned.`, { parse_mode: "Markdown" });
        } else {
            bot.sendMessage(msg.chat.id, `❌ Failed to unban business \`${bizId}\`.`, { parse_mode: "Markdown" });
        }
    });

    // ========== CALLBACK QUERY HANDLER ==========

    bot.on('callback_query', async (query) => {
        const chatId = query.message.chat.id;
        const messageId = query.message.message_id;
        const userId = query.from.id;
        const data = query.data;

        if (!data || !data.startsWith("biz_")) return;

        try {
            bot.answerCallbackQuery(query.id);

            // Menu callbacks
            if (data === "biz_menu_main") {
                return sendDirectoryMenu(chatId, userId, messageId);
            }

            if (data === "biz_menu_top") {
                const top = await getTopRatedBusinesses(10);
                return sendBusinessList(chatId, messageId, "🏆 *Top Rated Businesses*", top);
            }

            if (data === "biz_menu_recent") {
                const all = await getAllBusinesses(false);
                const recent = all.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 10);
                return sendBusinessList(chatId, messageId, "🆕 *Recently Added Businesses*", recent);
            }

            if (data === "biz_menu_categories") {
                const catButtons = CATEGORIES.map(c => [{ text: c.label, callback_data: `biz_cat_select_${c.id}` }]);
                catButtons.push([{ text: "🔙 Back to Directory", callback_data: "biz_menu_main" }]);
                return bot.editMessageText("📂 *Select a Business Category:*", {
                    chat_id: chatId,
                    message_id: messageId,
                    parse_mode: "Markdown",
                    reply_markup: { inline_keyboard: catButtons }
                });
            }

            if (data.startsWith("biz_cat_select_")) {
                const catId = data.replace("biz_cat_select_", "");
                const catObj = CATEGORIES.find(c => c.id === catId) || { label: catId };
                const list = await getBusinessesByCategory(catId);
                return sendBusinessList(chatId, messageId, `📂 *Category: ${catObj.label}*`, list, 0, "biz_menu_categories");
            }

            if (data === "biz_menu_search") {
                searchSessions[userId] = true;
                return bot.sendMessage(chatId, "🔎 *Quick Business Search*\n\nPlease type the name, keyword, or tag you are looking for (e.g. `food`, `laundry`, `braids`, `printing`):", { parse_mode: "Markdown" });
            }

            if (data === "biz_menu_mine") {
                return showMyBusiness(chatId, userId, messageId);
            }

            if (data === "biz_menu_register") {
                return startRegistration(chatId, userId);
            }

            // Pagination callbacks: biz_page_<num>
            if (data.startsWith("biz_page_")) {
                const pageNum = parseInt(data.replace("biz_page_", ""), 10) || 0;
                const all = await getAllBusinesses(false);
                return sendBusinessList(chatId, messageId, "🏢 *Campus Businesses*", all, pageNum);
            }

            // Rating callbacks
            if (data.startsWith("biz_rate_")) {
                const bizId = data.replace("biz_rate_", "");
                const biz = await getBusiness(bizId);
                if (!biz) {
                    return bot.sendMessage(chatId, "⚠️ Business not found.");
                }
                const starRow = [1, 2, 3, 4, 5].map(s => ({
                    text: `⭐ ${s}`,
                    callback_data: `biz_submitstar_${bizId}_${s}`
                }));

                return bot.sendMessage(chatId, `Rate *${biz.name}*:\nChoose a score from 1 to 5 stars ⭐`, {
                    parse_mode: "Markdown",
                    reply_markup: {
                        inline_keyboard: [
                            starRow,
                            [{ text: "❌ Cancel", callback_data: "biz_menu_main" }]
                        ]
                    }
                });
            }

            if (data.startsWith("biz_submitstar_")) {
                const parts = data.replace("biz_submitstar_", "").split("_");
                const bizId = parts[0];
                const stars = parseInt(parts[1], 10);

                const res = await rateBusiness(bizId, userId, stars);
                if (res.success) {
                    bot.sendMessage(chatId, `🎉 *Thank you!* You rated the business *${stars}/5 ⭐*.\nNew Average: *${res.newAverage} ⭐* (${res.totalRatings} reviews).`, { parse_mode: "Markdown" });
                } else {
                    bot.sendMessage(chatId, `⚠️ ${res.message || "Could not submit rating."}`);
                }
                return;
            }

            // Registration step callbacks
            if (data.startsWith("biz_reg_cat_")) {
                const catId = data.replace("biz_reg_cat_", "");
                const session = registrationSessions[userId];
                if (session) {
                    session.category = catId;
                    session.step = "STEP_TAGS";
                    return bot.sendMessage(chatId, `✅ Category set to *${catId}*.\n\nNow, enter 2 to 5 search tags/keywords separated by commas (e.g., \`food, snacks, cakes\` or \`tech, repair, phone\`):`, { parse_mode: "Markdown" });
                }
            }

            if (data === "biz_reg_skip_owner") {
                const session = registrationSessions[userId];
                if (session) {
                    session.ownerName = null;
                    session.showOwnerName = false;
                    session.step = "STEP_CONFIRM";
                    return showRegistrationPreview(chatId, session);
                }
            }

            if (data === "biz_reg_publish") {
                const session = registrationSessions[userId];
                if (!session) {
                    return bot.sendMessage(chatId, "⚠️ Registration session expired. Please start again with /register_business.");
                }

                const saved = await saveBusiness(session);
                delete registrationSessions[userId];

                if (saved) {
                    await bot.sendMessage(chatId, `🎉 *CONGRATULATIONS!*\nYour business *${saved.name}* has been successfully registered in the Campus Directory!`, { parse_mode: "Markdown" });

                    // NOTIFY ADMINS WITH REGISTRATION TIMESTAMP & DETAILS
                    const adminNotification = `📢 *NEW BUSINESS REGISTERED!*\n` +
                        `━━━━━━━━━━━━━━━━━━━━\n` +
                        `🆔 *Business ID:* \`${saved.id}\` \n` +
                        `🏢 *Name:* ${saved.name}\n` +
                        `📂 *Category:* ${saved.category}\n` +
                        `🔗 *Link:* ${saved.link}\n` +
                        `🏷️ *Tags:* ${(saved.tags || []).join(", ")}\n` +
                        `📝 *Description:* ${saved.description}\n` +
                        `👤 *Owner ID:* \`${saved.ownerUserId}\` ${saved.showOwnerName ? `(${saved.ownerName})` : '(Anonymous)'}\n` +
                        `📅 *Time:* ${new Date(saved.createdAt).toLocaleString()}\n\n` +
                        `⚙️ *Admin Ban Command:* \`/ban_business ${saved.id}\``;

                    notifyAdmins(adminNotification, bot);
                } else {
                    bot.sendMessage(chatId, "❌ Error saving business. Please try again later.");
                }
                return;
            }

            if (data === "biz_reg_restart") {
                delete registrationSessions[userId];
                return startRegistration(chatId, userId);
            }

            if (data === "biz_reg_cancel") {
                delete registrationSessions[userId];
                return bot.sendMessage(chatId, "❌ Business registration cancelled.");
            }

            // Deletion
            if (data.startsWith("biz_delete_")) {
                const bizId = data.replace("biz_delete_", "");
                await deleteBusiness(bizId);
                return bot.sendMessage(chatId, "🗑️ Business listing has been deleted.");
            }

            // Admin callbacks
            if (data === "biz_admin_hub") {
                return showAdminHub(chatId, userId, messageId);
            }

            if (data === "biz_admin_view_active") {
                const all = await getAllBusinesses(false);
                return sendBusinessList(chatId, messageId, "⚙️ *Admin: Active Businesses*", all, 0, "biz_admin_hub");
            }

            if (data === "biz_admin_view_banned") {
                const snapshot = await getAllBusinesses(true);
                const bannedList = snapshot.filter(b => b.status === "banned");
                return sendBusinessList(chatId, messageId, "⚙️ *Admin: Banned Businesses*", bannedList, 0, "biz_admin_hub");
            }

        } catch (error) {
            console.error("❌ Error in business callback query:", error);
        }
    });

    // ========== CONVERSATIONAL TEXT INPUT LISTENER ==========

    bot.on('message', async (msg) => {
        if (!msg.text || msg.text.startsWith("/")) return;

        const userId = msg.from.id;
        const chatId = msg.chat.id;

        // Quick search session handling
        if (searchSessions[userId]) {
            delete searchSessions[userId];
            const query = msg.text.trim();
            const results = await searchBusinesses(query);
            return sendBusinessList(chatId, null, `🔎 *Search Results for "${query}"*`, results);
        }

        // Registration session step handling
        const session = registrationSessions[userId];
        if (!session) return;

        const text = msg.text.trim();

        switch (session.step) {
            case "STEP_NAME":
                if (text.length < 2 || text.length > 60) {
                    return bot.sendMessage(chatId, "⚠️ Business name must be between 2 and 60 characters. Please re-enter:");
                }
                session.name = text;
                session.step = "STEP_LINK";
                return bot.sendMessage(chatId, `Great! Now enter your **Business Link or Handle** (e.g. Telegram channel link \`https://t.me/yourchannel\`, Instagram handle, website URL, or Snapchat username):`, { parse_mode: "Markdown" });

            case "STEP_LINK":
                session.link = text;
                session.step = "STEP_CATEGORY";

                const catButtons = CATEGORIES.map(c => [{ text: c.label, callback_data: `biz_reg_cat_${c.id}` }]);
                return bot.sendMessage(chatId, `Select a **Primary Category** for your business:`, {
                    reply_markup: { inline_keyboard: catButtons }
                });

            case "STEP_TAGS":
                const tags = text.split(",").map(t => t.trim()).filter(Boolean);
                if (tags.length === 0) {
                    return bot.sendMessage(chatId, "⚠️ Please provide at least 1 or 2 tags separated by commas:");
                }
                session.tags = tags;
                session.step = "STEP_DESC";
                return bot.sendMessage(chatId, `Enter a **Brief Description** of your business (services provided, location/hall delivery, etc.):`);

            case "STEP_DESC":
                if (text.length > 400) {
                    return bot.sendMessage(chatId, "⚠️ Description is too long (max 400 chars). Please shorten:");
                }
                session.description = text;
                session.step = "STEP_OWNER";

                return bot.sendMessage(chatId, `Would you like your **Owner Name** displayed on the business card?\n\nIf yes, type your full name. Or tap **[ 🚫 Skip / Hide Name ]** below:`, {
                    reply_markup: {
                        inline_keyboard: [[{ text: "🚫 Skip / Hide Owner Name", callback_data: "biz_reg_skip_owner" }]]
                    }
                });

            case "STEP_OWNER":
                session.ownerName = text;
                session.showOwnerName = true;
                session.step = "STEP_CONFIRM";
                return showRegistrationPreview(chatId, session);

            default:
                break;
        }
    });

    // ========== REGISTRATION FLOW HELPERS ==========

    async function startRegistration(chatId, userId) {
        const existing = await getUserBusiness(userId);
        if (existing) {
            return bot.sendMessage(chatId, `⚠️ You already have a registered business: *${existing.name}*.\nUse \`/my_business\` to view or manage it.`, { parse_mode: "Markdown" });
        }

        registrationSessions[userId] = {
            ownerUserId: userId,
            step: "STEP_NAME"
        };

        bot.sendMessage(chatId, `📝 *Business Directory Registration*\n━━━━━━━━━━━━━━━━━━━━\nLet's register your campus business!\n\nFirst, enter your **Official Business Name**:`, { parse_mode: "Markdown" });
    }

    function showRegistrationPreview(chatId, session) {
        const previewText = `📋 *PREVIEW YOUR BUSINESS LISTING*\n━━━━━━━━━━━━━━━━━━━━\n` +
            formatBusinessCard(session) +
            `\n\nIs everything correct? Tap **[ ✅ Confirm & Publish ]** to list your business!`;

        const keyboard = {
            inline_keyboard: [
                [{ text: "✅ Confirm & Publish", callback_data: "biz_reg_publish" }],
                [{ text: "✏️ Restart", callback_data: "biz_reg_restart" }, { text: "❌ Cancel", callback_data: "biz_reg_cancel" }]
            ]
        };

        bot.sendMessage(chatId, previewText, { parse_mode: "Markdown", reply_markup: keyboard });
    }

    async function showMyBusiness(chatId, userId, messageId = null) {
        const biz = await getUserBusiness(userId);
        if (!biz) {
            const text = "💼 You have not registered any business yet.\nTap below to register!";
            const keyboard = { inline_keyboard: [[{ text: "➕ Register Business Now", callback_data: "biz_menu_register" }]] };
            if (messageId) return bot.editMessageText(text, { chat_id: chatId, message_id: messageId, reply_markup: keyboard });
            return bot.sendMessage(chatId, text, { reply_markup: keyboard });
        }

        const text = `💼 *YOUR REGISTERED BUSINESS*\n━━━━━━━━━━━━━━━━━━━━\n` + formatBusinessCard(biz);
        const actionKeyboard = getBusinessActionButtons(biz, true);
        actionKeyboard.inline_keyboard.push([{ text: "🔙 Back to Directory", callback_data: "biz_menu_main" }]);

        if (messageId) return bot.editMessageText(text, { chat_id: chatId, message_id: messageId, parse_mode: "Markdown", reply_markup: actionKeyboard });
        return bot.sendMessage(chatId, text, { parse_mode: "Markdown", reply_markup: actionKeyboard });
    }

    async function showAdminHub(chatId, userId, messageId = null) {
        const isAdmin = await isUserAdmin(userId);
        if (!isAdmin && userId !== 6311922657) {
            return bot.sendMessage(chatId, "❌ Unauthorized access.");
        }

        const stats = await getBusinessStats();
        const text = `⚙️ *ADMIN BUSINESS DIRECTORY HUB*\n━━━━━━━━━━━━━━━━━━━━\n` +
            `📊 *Directory Statistics:*\n` +
            `📦 *Total Registered:* ${stats.total}\n` +
            `✅ *Active Businesses:* ${stats.active}\n` +
            `🚫 *Banned Businesses:* ${stats.banned}\n` +
            `🗑️ *Deleted Listings:* ${stats.deleted}\n\n` +
            `💡 *Admin Commands:*\n` +
            `• \`/ban_business <business_id>\`\n` +
            `• \`/unban_business <business_id>\``;

        const keyboard = {
            inline_keyboard: [
                [{ text: "📋 View Active Businesses", callback_data: "biz_admin_view_active" }],
                [{ text: "🚫 View Banned Businesses", callback_data: "biz_admin_view_banned" }],
                [{ text: "🔙 Back to Directory", callback_data: "biz_menu_main" }]
            ]
        };

        if (messageId) return bot.editMessageText(text, { chat_id: chatId, message_id: messageId, parse_mode: "Markdown", reply_markup: keyboard });
        return bot.sendMessage(chatId, text, { parse_mode: "Markdown", reply_markup: keyboard });
    }
};
