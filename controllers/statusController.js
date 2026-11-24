const fs = require("fs");
const path = require("path");
const database = require("../config/db");
const {createNotification} = require("../utils/notificationHelper");

const STATUS_TTL_HOURS = 24;

function canViewUserStatuses(viewerId, targetUserId, callback) {
    const viewer = parseInt(viewerId, 10);
    const target = parseInt(targetUserId, 10);

    if (!viewer || !target) {
        return callback(null, false);
    }

    if (viewer === target) {
        return callback(null, true);
    }

    const query = `
        SELECT 1 FROM follows f1
        WHERE f1.followerId = ? AND f1.followingId = ?
        AND EXISTS (
            SELECT 1 FROM follows f2
            WHERE f2.followerId = ? AND f2.followingId = ?
        )
        LIMIT 1
    `;

    database.query(query, [viewer, target, target, viewer], (err, rows) => {
        if (err) {
            return callback(err, false);
        }
        callback(null, rows.length > 0);
    });
}

function mapStatusRow(row, viewerId) {
    return {
        statusId: row.statusId,
        userId: row.userId,
        mediaUri: row.mediaUri,
        mediaType: row.mediaType,
        caption: row.caption,
        createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : null,
        expiresAt: row.expiresAt ? new Date(row.expiresAt).toISOString() : null,
        likeCount: Number(row.likeCount || 0),
        isLiked: row.isLiked ? 1 : 0,
        hasViewed: row.hasViewed ? 1 : 0,
        username: row.username,
        profileImage: row.profileImage,
        isOwn: row.userId === viewerId ? 1 : 0,
    };
}

function groupStatusesByUser(rows, viewerId) {
    const groups = [];
    const map = new Map();

    rows.forEach((row) => {
        const userId = row.userId;
        if (!map.has(userId)) {
            const group = {
                userId,
                username: row.username,
                profileImage: row.profileImage,
                isOwn: userId === viewerId ? 1 : 0,
                hasUnseen: 0,
                statuses: [],
            };
            map.set(userId, group);
            groups.push(group);
        }

        const status = mapStatusRow(row, viewerId);
        map.get(userId).statuses.push(status);
        if (status.hasViewed === 0 && userId !== viewerId) {
            map.get(userId).hasUnseen = 1;
        }
    });

    return groups.sort((a, b) => {
        if (a.isOwn !== b.isOwn) {
            return b.isOwn - a.isOwn;
        }
        if (a.hasUnseen !== b.hasUnseen) {
            return b.hasUnseen - a.hasUnseen;
        }
        return 0;
    });
}

const createStatus = (req, res) => {
    const userId = parseInt(req.body.userId, 10);
    const caption = req.body.caption || null;

    if (!userId) {
        return res.json({success: false, message: "userId is required"});
    }

    if (!req.file) {
        return res.json({success: false, message: "No image uploaded"});
    }

    const mediaUri = "uploads/statuses/" + req.file.filename;

    const insertQuery = `
        INSERT INTO statuses (userId, mediaUri, mediaType, caption, expiresAt)
        VALUES (?, ?, 'image', ?, DATE_ADD(NOW(), INTERVAL ? HOUR))
    `;

    database.query(insertQuery, [userId, mediaUri, caption, STATUS_TTL_HOURS], (err, result) => {
        if (err) {
            console.error("Create status failed:", err.message);
            return res.json({success: false, message: "Failed to create status"});
        }

        res.json({
            success: true,
            message: "Status posted",
            data: {
                statusId: result.insertId,
                userId,
                mediaUri,
                caption,
            },
        });
    });
};

const getStatusFeed = (req, res) => {
    const viewerId = parseInt(req.query.userId, 10);

    if (!viewerId) {
        return res.json({success: false, message: "userId is required"});
    }

    const query = `
        SELECT
            s.statusId,
            s.userId,
            s.mediaUri,
            s.mediaType,
            s.caption,
            s.createdAt,
            s.expiresAt,
            u.username,
            u.profile_image AS profileImage,
            (SELECT COUNT(*) FROM status_like sl WHERE sl.statusId = s.statusId) AS likeCount,
            EXISTS(
                SELECT 1 FROM status_like sl
                WHERE sl.statusId = s.statusId AND sl.userId = ?
            ) AS isLiked,
            EXISTS(
                SELECT 1 FROM status_views sv
                WHERE sv.statusId = s.statusId AND sv.viewerId = ?
            ) AS hasViewed
        FROM statuses s
        JOIN users u ON u.userId = s.userId
        WHERE s.expiresAt > NOW()
        AND (
            s.userId = ?
            OR (
                EXISTS (
                    SELECT 1 FROM follows f1
                    WHERE f1.followerId = ? AND f1.followingId = s.userId
                )
                AND EXISTS (
                    SELECT 1 FROM follows f2
                    WHERE f2.followerId = s.userId AND f2.followingId = ?
                )
            )
        )
        ORDER BY s.userId = ? DESC, s.createdAt ASC
    `;

    database.query(query, [viewerId, viewerId, viewerId, viewerId, viewerId, viewerId], (err, rows) => {
        if (err) {
            console.error("Status feed failed:", err.message);
            return res.json({success: false, message: "Unable to load statuses"});
        }

        res.json({success: true, data: groupStatusesByUser(rows || [], viewerId)});
    });
};

const getUserStatuses = (req, res) => {
    const targetUserId = parseInt(req.params.userId, 10);
    const viewerId = parseInt(req.query.viewerId, 10);

    if (!targetUserId || !viewerId) {
        return res.json({success: false, message: "userId and viewerId are required"});
    }

    canViewUserStatuses(viewerId, targetUserId, (permErr, allowed) => {
        if (permErr) {
            return res.json({success: false, message: "Unable to load statuses"});
        }

        if (!allowed) {
            return res.json({success: false, message: "You can only view friends' statuses"});
        }

        const query = `
            SELECT
                s.statusId,
                s.userId,
                s.mediaUri,
                s.mediaType,
                s.caption,
                s.createdAt,
                s.expiresAt,
                u.username,
                u.profile_image AS profileImage,
                (SELECT COUNT(*) FROM status_like sl WHERE sl.statusId = s.statusId) AS likeCount,
                EXISTS(
                    SELECT 1 FROM status_like sl
                    WHERE sl.statusId = s.statusId AND sl.userId = ?
                ) AS isLiked,
                EXISTS(
                    SELECT 1 FROM status_views sv
                    WHERE sv.statusId = s.statusId AND sv.viewerId = ?
                ) AS hasViewed
            FROM statuses s
            JOIN users u ON u.userId = s.userId
            WHERE s.userId = ? AND s.expiresAt > NOW()
            ORDER BY s.createdAt ASC
        `;

        database.query(query, [viewerId, viewerId, targetUserId], (err, rows) => {
            if (err) {
                console.error("User statuses failed:", err.message);
                return res.json({success: false, message: "Unable to load statuses"});
            }

            const statuses = (rows || []).map((row) => mapStatusRow(row, viewerId));
            res.json({
                success: true,
                data: {
                    userId: targetUserId,
                    username: statuses.length ? statuses[0].username : null,
                    profileImage: statuses.length ? statuses[0].profileImage : null,
                    isOwn: targetUserId === viewerId ? 1 : 0,
                    statuses,
                },
            });
        });
    });
};

const markStatusViewed = (req, res) => {
    const statusId = parseInt(req.body.statusId, 10);
    const viewerId = parseInt(req.body.viewerId, 10);

    if (!statusId || !viewerId) {
        return res.json({success: false, message: "statusId and viewerId are required"});
    }

    database.query(
        "INSERT IGNORE INTO status_views (statusId, viewerId) VALUES (?, ?)",
        [statusId, viewerId],
        (err) => {
            if (err) {
                return res.json({success: false, message: "Unable to mark status as viewed"});
            }
            res.json({success: true, message: "Status viewed"});
        }
    );
};

const likeStatus = (req, res) => {
    const userId = parseInt(req.body.userId, 10);
    const statusId = parseInt(req.body.statusId, 10);

    if (!userId || !statusId) {
        return res.json({success: false, message: "userId and statusId are required"});
    }

    database.query(
        "SELECT userId FROM statuses WHERE statusId = ? AND expiresAt > NOW()",
        [statusId],
        (err, rows) => {
            if (err || !rows.length) {
                return res.json({success: false, message: "Status not found"});
            }

            const ownerId = parseInt(rows[0].userId, 10);

            database.query(
                "INSERT INTO status_like (statusId, userId) VALUES (?, ?)",
                [statusId, userId],
                (likeErr) => {
                    if (likeErr) {
                        return res.json({success: false, message: "Failed to like status"});
                    }

                    database.query(
                        "SELECT COUNT(*) AS likeCount FROM status_like WHERE statusId = ?",
                        [statusId],
                        (countErr, countRows) => {
                            const likeCount = countErr ? 0 : Number(countRows[0].likeCount || 0);

                            createNotification({
                                userId: ownerId,
                                actorId: userId,
                                type: "status_like",
                                statusId,
                                message: "liked your status",
                            });

                            res.json({success: true, message: "Status liked", likeCount});
                        }
                    );
                }
            );
        }
    );
};

const unlikeStatus = (req, res) => {
    const userId = parseInt(req.body.userId, 10);
    const statusId = parseInt(req.body.statusId, 10);

    if (!userId || !statusId) {
        return res.json({success: false, message: "userId and statusId are required"});
    }

    database.query(
        "DELETE FROM status_like WHERE statusId = ? AND userId = ?",
        [statusId, userId],
        (err) => {
            if (err) {
                return res.json({success: false, message: "Failed to unlike status"});
            }

            database.query(
                "SELECT COUNT(*) AS likeCount FROM status_like WHERE statusId = ?",
                [statusId],
                (countErr, countRows) => {
                    const likeCount = countErr ? 0 : Number(countRows[0].likeCount || 0);
                    res.json({success: true, message: "Status unliked", likeCount});
                }
            );
        }
    );
};

const deleteStatus = (req, res) => {
    const userId = parseInt(req.body.userId, 10);
    const statusId = parseInt(req.body.statusId, 10);

    if (!userId || !statusId) {
        return res.json({success: false, message: "userId and statusId are required"});
    }

    database.query(
        "SELECT mediaUri FROM statuses WHERE statusId = ? AND userId = ?",
        [statusId, userId],
        (err, rows) => {
            if (err) {
                return res.json({success: false, message: "Unable to delete status"});
            }

            if (!rows.length) {
                return res.json({success: false, message: "Status not found"});
            }

            const mediaUri = rows[0].mediaUri;

            const cleanupSteps = [
                {sql: "DELETE FROM notifications WHERE statusId = ?", params: [statusId], optional: true},
                {sql: "DELETE FROM status_like WHERE statusId = ?", params: [statusId]},
                {sql: "DELETE FROM status_views WHERE statusId = ?", params: [statusId]},
                {sql: "DELETE FROM statuses WHERE statusId = ? AND userId = ?", params: [statusId, userId]},
            ];

            const runStep = (index) => {
                if (index >= cleanupSteps.length) {
                    if (mediaUri) {
                        const filePath = path.join(__dirname, "..", mediaUri);
                        fs.unlink(filePath, () => {});
                    }
                    return res.json({success: true, message: "Status deleted"});
                }

                const step = cleanupSteps[index];
                database.query(step.sql, step.params, (stepErr) => {
                    if (stepErr) {
                        if (step.optional) {
                            return runStep(index + 1);
                        }
                        return res.json({success: false, message: "Unable to delete status"});
                    }
                    runStep(index + 1);
                });
            };

            runStep(0);
        }
    );
};

module.exports = {
    createStatus,
    getStatusFeed,
    getUserStatuses,
    markStatusViewed,
    likeStatus,
    unlikeStatus,
    deleteStatus,
};
