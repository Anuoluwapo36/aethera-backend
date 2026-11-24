const database = require("../config/db");

const getNotifications = (req, res) => {
    const userId = parseInt(req.params.userId, 10);
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 30;
    const offset = (page - 1) * limit;

    if (!userId) {
        return res.json({success: false, message: "userId is required"});
    }

    const query = `
        SELECT
            n.notificationId,
            n.userId,
            n.actorId,
            n.type,
            n.postId,
            n.message,
            n.isRead,
            n.createdAt,
            u.username AS actorUsername,
            u.profile_image AS actorProfileImage
        FROM notifications n
        LEFT JOIN users u ON u.userId = n.actorId
        WHERE n.userId = ?
        ORDER BY n.createdAt DESC
        LIMIT ? OFFSET ?
    `;

    database.query(query, [userId, limit, offset], (err, results) => {
        if (err) {
            console.error("ERROR:", err);
            return res.json({success: false, message: "Unable to load notifications"});
        }

        const data = (results || []).map((row) => ({
            notificationId: row.notificationId,
            userId: row.userId,
            actorId: row.actorId,
            type: row.type,
            postId: row.postId,
            statusId: null,
            message: row.message,
            isRead: row.isRead ? 1 : 0,
            createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : null,
            actorUsername: row.actorUsername || "Someone",
            actorProfileImage: row.actorProfileImage || null,
        }));

        res.json({success: true, data});
    });
};

const getUnreadCount = (req, res) => {
    const userId = parseInt(req.params.userId, 10);

    if (!userId) {
        return res.json({success: false, message: "userId is required"});
    }

    database.query(
        "SELECT COUNT(*) AS unreadCount FROM notifications WHERE userId = ? AND (isRead = 0 OR isRead IS NULL)",
        [userId],
        (err, results) => {
            if (err) {
                return res.json({success: false, message: "Unable to get unread count"});
            }
            res.json({success: true, unreadCount: Number(results[0].unreadCount || 0)});
        }
    );
};

const markAsRead = (req, res) => {
    const notificationId = parseInt(req.params.notificationId, 10);
    const userId = parseInt(req.body.userId, 10);

    if (!notificationId || !userId) {
        return res.json({success: false, message: "notificationId and userId are required"});
    }

    database.query(
        "UPDATE notifications SET isRead = 1 WHERE notificationId = ? AND userId = ?",
        [notificationId, userId],
        (err, result) => {
            if (err) {
                return res.json({success: false, message: "Unable to mark notification as read"});
            }
            res.json({success: true, message: "Notification marked as read"});
        }
    );
};

const markAllAsRead = (req, res) => {
    const userId = parseInt(req.params.userId, 10);

    if (!userId) {
        return res.json({success: false, message: "userId is required"});
    }

    database.query("UPDATE notifications SET isRead = 1 WHERE userId = ? AND isRead = 0", [userId], (err) => {
        if (err) {
            return res.json({success: false, message: "Unable to mark all as read"});
        }
        res.json({success: true, message: "All notifications marked as read"});
    });
};

module.exports = {getNotifications, getUnreadCount, markAsRead, markAllAsRead};
