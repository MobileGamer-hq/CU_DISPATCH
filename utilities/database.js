// utilities/database.js
const admin = require("./firebase");
const {validateLevel, validateMatricNumber} = require("./verification"); // Import Firebase Admin SDK properly






// ========== USER FUNCTIONS ==========

// Get all user IDs
async function getUserIds() {
    try {
        const db = admin.database();
        const snapshot = await db.ref("users").once("value");
        const users = snapshot.val();

        if (users) {
            const userIds = Object.keys(users);
            return userIds;
        } else {
            console.log("⚠️ No users found.");
            return [];
        }
    } catch (error) {
        console.error("❌ Error fetching user IDs:", error);
        return [];
    }
}

// Get a specific user by userId
async function getUser(userId) {
    try {
        const db = admin.database();
        const snapshot = await db.ref(`users/${userId}`).once("value");
        return snapshot.exists() ? snapshot.val() : null;
    } catch (error) {
        console.error("❌ Error fetching user:", error);
        return null;
    }
}

// Add a single user
async function addUser(userId, userInfo = {}) {
    try {
        if(validateLevel(userInfo.level) && validateMatricNumber(userInfo.matric_number)) {
            const db = admin.database();
            await db.ref(`users/${userId}`).set({
                ...userInfo,
                joinedAt: new Date().toISOString(),
            });
            console.log(`✅ User ${userId} added successfully.`);
            return true;
        }else{
            console.log("User credentials not accurate");
            return false;
        }
    } catch (error) {
        console.error(`❌ Error adding user ${userId}:`, error);
        return false;
    }
}

// Add multiple users
async function addMultipleUsers(users = []) {
    const results = [];
    for (const user of users) {
        const { userId, ...info } = user;
        const success = await addUser(userId, info);
        results.push({ userId, success });
    }
    return results;
}

// Get all users
async function getAllUsers() {
    try {
        const db = admin.database();
        const snapshot = await db.ref("users").once("value");
        return snapshot.exists() ? snapshot.val() : {};
    } catch (error) {
        console.error("❌ Error fetching all users:", error);
        return {};
    }
}

// Delete a user
async function deleteUser(userId) {
    try {
        const db = admin.database();
        // await db.ref(`users/${userId}`).remove();
        console.log(`✅ User ${userId} deleted successfully.`);
    } catch (error) {
        console.error("❌ Error deleting user:", error);
        throw error;
    }
}

// ========== ADMIN FUNCTIONS ==========

async function isUserAdmin(userId) {
    try {
        const snapshot = await admin.database().ref(`admins/${userId}`).once("value");
        return snapshot.exists();
    } catch (error) {
        console.error("❌ Error checking admin status:", error);
        return false;
    }
}

async function addAdmin(userId) {
    try {
        const db = admin.database();
        await db.ref(`admins/${userId}`).set(true);
        console.log(`✅ Admin ${userId} added successfully.`);
    } catch (error) {
        console.error("❌ Error adding admin:", error);
        throw error;
    }
}

async function getAllAdmins() {
    try {
        const db = admin.database();
        const snapshot = await db.ref("admins").once("value");
        return snapshot.exists() ? snapshot.val() : {};
    } catch (error) {
        console.error("❌ Error fetching all admins:", error);
        return {};
    }
}

async function removeAdmin(userId) {
    try {
        const db = admin.database();
        await db.ref(`admins/${userId}`).remove();
        console.log(`✅ Admin ${userId} removed successfully.`);
    } catch (error) {
        console.error("❌ Error removing admin:", error);
        throw error;
    }
}

// Get user by matric number
async function getUserByMatricNumber(matricNumber) {
    try {
        const db = admin.database();
        const snapshot = await db
            .ref("users")
            .orderByChild("matric_number")
            .equalTo(matricNumber)
            .once("value");

        if (snapshot.exists()) {
            return snapshot.val();
        } else {
            console.log("⚠️ No user found with that matric number.");
            return null;
        }
    } catch (error) {
        console.error("❌ Error fetching user by matric number:", error);
        return null;
    }
}

// Add admin by matric number
async function addAdminByMatricNumber(matricNumber) {
    try {
        const db = admin.database();
        const snapshot = await db
            .ref("users")
            .orderByChild("matric_number")
            .equalTo(matricNumber)
            .once("value");

        if (!snapshot.exists()) return null;

        const userData = snapshot.val();
        const userId = Object.keys(userData)[0];

        await db.ref(`admins/${userId}`).set(true);
        console.log(`✅ Admin added by matric number: ${matricNumber}`);

        return userData[userId];
    } catch (error) {
        console.error("❌ Error adding admin by matric number:", error);
        return null;
    }
}

// Send a message to all admins
async function sendToAllAdmins(message, chatId, bot) {
    try {
        const db = admin.database();
        const snapshot = await db.ref("admins").once("value");
        const admins = snapshot.exists() ? Object.keys(snapshot.val()) : [];

        if (admins.length === 0) {
            console.log("⚠️ No admins to send to.");
            if (chatId && bot) await bot.sendMessage(chatId, "No admins found.");
            return;
        }

        for (const adminId of admins) {
            try {
                await bot.sendMessage(adminId, message);
            } catch (error) {
                console.error(`⚠️ Failed to send message to admin ${adminId}:`, error.message);
            }
        }

        if (chatId && bot) await bot.sendMessage(chatId, "✅ Message sent to all admins!");
    } catch (error) {
        console.error("❌ Error sending message to all admins:", error);
    }
}

// Send a broadcast notification to admins directly (without requiring chatId)
async function notifyAdmins(message, bot) {
    try {
        const db = admin.database();
        const snapshot = await db.ref("admins").once("value");
        const admins = snapshot.exists() ? Object.keys(snapshot.val()) : [];

        // Ensure primary owner ID 6311922657 is always included
        if (!admins.includes("6311922657")) {
            admins.push("6311922657");
        }

        for (const adminId of admins) {
            try {
                await bot.sendMessage(adminId, message, { parse_mode: "Markdown" });
            } catch (error) {
                console.error(`⚠️ Failed to notify admin ${adminId}:`, error.message);
            }
        }
    } catch (error) {
        console.error("❌ Error notifying admins:", error);
    }
}

// ========== BUSINESS DIRECTORY FUNCTIONS ==========

// Save or update a business
async function saveBusiness(businessData) {
    try {
        const db = admin.database();
        const businessId = businessData.id || `biz_${Date.now()}_${businessData.ownerUserId}`;
        const normalizedTags = (businessData.tags || []).map(t => t.trim().toLowerCase());
        if (businessData.name) normalizedTags.push(businessData.name.trim().toLowerCase());

        const payload = {
            id: businessId,
            ownerUserId: String(businessData.ownerUserId),
            name: businessData.name,
            link: businessData.link,
            linkType: businessData.linkType || "other",
            category: businessData.category || "General",
            tags: businessData.tags || [],
            normalizedTags,
            description: businessData.description || "",
            ownerName: businessData.ownerName || null,
            showOwnerName: Boolean(businessData.showOwnerName),
            averageRating: businessData.averageRating || 0,
            totalRatings: businessData.totalRatings || 0,
            sumRating: businessData.sumRating || 0,
            status: businessData.status || "active",
            createdAt: businessData.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        await db.ref(`businesses/${businessId}`).set(payload);
        return payload;
    } catch (error) {
        console.error("❌ Error saving business:", error);
        return null;
    }
}

// Get a business by business ID
async function getBusiness(businessId) {
    try {
        const db = admin.database();
        const snapshot = await db.ref(`businesses/${businessId}`).once("value");
        return snapshot.exists() ? snapshot.val() : null;
    } catch (error) {
        console.error("❌ Error getting business:", error);
        return null;
    }
}

// Get user's active registered business
async function getUserBusiness(userId) {
    try {
        const db = admin.database();
        const snapshot = await db
            .ref("businesses")
            .orderByChild("ownerUserId")
            .equalTo(String(userId))
            .once("value");

        if (!snapshot.exists()) return null;

        const val = snapshot.val();
        const keys = Object.keys(val);
        // Return the first non-deleted business
        for (const k of keys) {
            if (val[k].status !== "deleted") {
                return val[k];
            }
        }
        return null;
    } catch (error) {
        console.error("❌ Error fetching user business:", error);
        return null;
    }
}

// Get all businesses (optionally including banned)
async function getAllBusinesses(includeBanned = false) {
    try {
        const db = admin.database();
        const snapshot = await db.ref("businesses").once("value");
        if (!snapshot.exists()) return [];

        const val = snapshot.val();
        return Object.values(val).filter(b => {
            if (b.status === "deleted") return false;
            if (!includeBanned && b.status === "banned") return false;
            return true;
        });
    } catch (error) {
        console.error("❌ Error getting all businesses:", error);
        return [];
    }
}

// Search businesses by keyword or category
async function searchBusinesses(query) {
    try {
        const all = await getAllBusinesses(false);
        if (!query || query.trim() === "") return all;

        const q = query.trim().toLowerCase();
        return all.filter(b => {
            if (b.name && b.name.toLowerCase().includes(q)) return true;
            if (b.category && b.category.toLowerCase().includes(q)) return true;
            if (b.description && b.description.toLowerCase().includes(q)) return true;
            if (b.normalizedTags && b.normalizedTags.some(t => t.includes(q))) return true;
            return false;
        });
    } catch (error) {
        console.error("❌ Error searching businesses:", error);
        return [];
    }
}

// Get businesses by category
async function getBusinessesByCategory(category) {
    try {
        const all = await getAllBusinesses(false);
        if (!category || category === "all") return all;
        const catLower = category.toLowerCase();
        return all.filter(b => b.category && b.category.toLowerCase() === catLower);
    } catch (error) {
        console.error("❌ Error getting businesses by category:", error);
        return [];
    }
}

// Get top-rated businesses
async function getTopRatedBusinesses(limit = 10) {
    try {
        const all = await getAllBusinesses(false);
        return all
            .sort((a, b) => {
                if (b.averageRating !== a.averageRating) {
                    return b.averageRating - a.averageRating;
                }
                return (b.totalRatings || 0) - (a.totalRatings || 0);
            })
            .slice(0, limit);
    } catch (error) {
        console.error("❌ Error getting top rated businesses:", error);
        return [];
    }
}

// Rate a business (1-5 stars)
async function rateBusiness(businessId, userId, stars) {
    try {
        const db = admin.database();
        const biz = await getBusiness(businessId);
        if (!biz || biz.status !== "active") {
            return { success: false, message: "Business not found or unavailable." };
        }

        const ratingRef = db.ref(`ratings/${businessId}/${userId}`);
        const existingRatingSnap = await ratingRef.once("value");

        let oldScore = 0;
        let isNewRating = true;

        if (existingRatingSnap.exists()) {
            oldScore = existingRatingSnap.val().stars || 0;
            isNewRating = false;
        }

        // Save new user rating
        await ratingRef.set({
            userId: String(userId),
            stars: Number(stars),
            updatedAt: new Date().toISOString()
        });

        // Recalculate business totals
        const currentSum = biz.sumRating || 0;
        const currentTotal = biz.totalRatings || 0;

        const newSum = currentSum - oldScore + Number(stars);
        const newTotal = isNewRating ? currentTotal + 1 : currentTotal;
        const newAvg = Number((newSum / (newTotal || 1)).toFixed(1));

        await db.ref(`businesses/${businessId}`).update({
            sumRating: newSum,
            totalRatings: newTotal,
            averageRating: newAvg,
            updatedAt: new Date().toISOString()
        });

        return {
            success: true,
            isUpdate: !isNewRating,
            newAverage: newAvg,
            totalRatings: newTotal
        };
    } catch (error) {
        console.error("❌ Error rating business:", error);
        return { success: false, message: "Failed to submit rating." };
    }
}

// Admin function: Ban a business
async function banBusiness(businessId) {
    try {
        const db = admin.database();
        await db.ref(`businesses/${businessId}`).update({
            status: "banned",
            updatedAt: new Date().toISOString()
        });
        return true;
    } catch (error) {
        console.error("❌ Error banning business:", error);
        return false;
    }
}

// Admin function: Unban a business
async function unbanBusiness(businessId) {
    try {
        const db = admin.database();
        await db.ref(`businesses/${businessId}`).update({
            status: "active",
            updatedAt: new Date().toISOString()
        });
        return true;
    } catch (error) {
        console.error("❌ Error unbanning business:", error);
        return false;
    }
}

// Delete business (Soft delete)
async function deleteBusiness(businessId) {
    try {
        const db = admin.database();
        await db.ref(`businesses/${businessId}`).update({
            status: "deleted",
            updatedAt: new Date().toISOString()
        });
        return true;
    } catch (error) {
        console.error("❌ Error deleting business:", error);
        return false;
    }
}

// Admin stats: Get summary count of businesses
async function getBusinessStats() {
    try {
        const db = admin.database();
        const snapshot = await db.ref("businesses").once("value");
        if (!snapshot.exists()) {
            return { total: 0, active: 0, banned: 0, deleted: 0 };
        }

        const all = Object.values(snapshot.val());
        const total = all.length;
        const active = all.filter(b => b.status === "active").length;
        const banned = all.filter(b => b.status === "banned").length;
        const deleted = all.filter(b => b.status === "deleted").length;

        return { total, active, banned, deleted };
    } catch (error) {
        console.error("❌ Error getting business stats:", error);
        return { total: 0, active: 0, banned: 0, deleted: 0 };
    }
}

// ========== EXPORTS ==========
module.exports = {
    getUserIds,
    getUser,
    getAllUsers,
    addUser,
    addMultipleUsers,
    deleteUser,

    isUserAdmin,
    addAdmin,
    getAllAdmins,
    removeAdmin,
    sendToAllAdmins,
    notifyAdmins,

    getUserByMatricNumber,
    addAdminByMatricNumber,

    // Business functions
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
    getBusinessStats
};

