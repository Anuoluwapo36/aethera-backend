const database = require("../config/db");

const LIKE_MILESTONES = [100, 500, 1000, 10000];

/** Maps extra types to values allowed by the base notifications.type enum. */
function normalizeNotificationType(type, message) {
    if (type === "like_milestone") {
        return {type: "like", message: message || "Your post is getting popular"};
    }
    if (type === "status_like") {
        return {type: "like", message: message || "liked your status"};
    }
    return {type, message: message || null};
}

function createNotification({userId, actorId, type, postId, message}, callback) {
    const recipientId = parseInt(userId, 10);
    const actor = parseInt(actorId, 10);

    if (!recipientId || !actor || !type) {
        if (callback) {
            callback(null);
        }
        return;
    }

    if (recipientId === actor && type !== "like_milestone") {
        if (callback) {
            callback(null);
        }
        return;
    }

    const normalized = normalizeNotificationType(type, message);

    const insertQuery = `
        INSERT INTO notifications (userId, actorId, type, postId, message)
        VALUES (?, ?, ?, ?, ?)
    `;

    database.query(
        insertQuery,
        [
            recipientId,
            actor,
            normalized.type,
            postId ? parseInt(postId, 10) : null,
            normalized.message,
        ],
        (err) => {
            if (err) {
                console.error("Notification insert failed:", err.message);
            } else {
                console.log(
                    `Notification saved: ${normalized.type} -> user ${recipientId} from actor ${actor}`
                );
            }
            if (callback) {
                callback(err);
            }
        }
    );
}

function getPostOwnerId(postId, callback) {
    database.query("SELECT userId FROM posts WHERE postId = ?", [postId], (err, results) => {
        if (err) {
            return callback(err, null);
        }
        if (!results.length) {
            return callback(null, null);
        }
        callback(null, parseInt(results[0].userId, 10));
    });
}

function maybeCreateLikeMilestoneNotification(ownerId, postId, likeCount, callback) {
    const owner = parseInt(ownerId, 10);
    const post = parseInt(postId, 10);
    const count = parseInt(likeCount, 10);

    if (!owner || !post || !LIKE_MILESTONES.includes(count)) {
        if (callback) {
            callback(null);
        }
        return;
    }

    const message = `Your post reached ${count} likes`;

    database.query(
        `SELECT notificationId FROM notifications
         WHERE userId = ? AND postId = ? AND type = 'like' AND message = ?
         LIMIT 1`,
        [owner, post, message],
        (err, rows) => {
            if (err) {
                console.error("Milestone check failed:", err.message);
                if (callback) {
                    callback(err);
                }
                return;
            }

            if (rows.length) {
                if (callback) {
                    callback(null);
                }
                return;
            }

            createNotification(
                {
                    userId: owner,
                    actorId: owner,
                    type: "like_milestone",
                    postId: post,
                    message,
                },
                callback
            );
        }
    );
}

/**
 * Comment notifications:
 * - Top-level on someone else's post -> notify post owner
 * - Reply to a comment -> notify the author of that comment (e.g. Mercy replies -> Anuoluwapo gets it)
 * - Top-level on your own post -> notify everyone else who already commented
 */
function notifyCommentActivity({postId, actorId, replyTo}) {
    const actor = parseInt(actorId, 10);
    const post = parseInt(postId, 10);
    const replyToId = replyTo != null && parseInt(replyTo, 10) > 0 ? parseInt(replyTo, 10) : 0;

    if (!actor || !post) {
        return;
    }

    console.log(`notifyCommentActivity post=${post} actor=${actor} replyTo=${replyToId || "none"}`);

    if (replyToId) {
        database.query(
            "SELECT userId FROM comments WHERE commentId = ? AND postId = ?",
            [replyToId, post],
            (err, rows) => {
                if (err) {
                    console.error("Reply parent lookup failed:", err.message);
                    return;
                }
                if (!rows.length) {
                    console.log(`No parent comment ${replyToId} on post ${post}`);
                    return;
                }
                const parentAuthorId = parseInt(rows[0].userId, 10);
                if (parentAuthorId && parentAuthorId !== actor) {
                    createNotification({
                        userId: parentAuthorId,
                        actorId: actor,
                        type: "comment",
                        postId: post,
                        message: "replied to your comment",
                    });
                }
            }
        );
        return;
    }

    getPostOwnerId(post, (ownerErr, ownerId) => {
        const owner = ownerErr ? 0 : parseInt(ownerId, 10);

        if (owner && owner !== actor) {
            createNotification({
                userId: owner,
                actorId: actor,
                type: "comment",
                postId: post,
                message: "commented on your post",
            });
            return;
        }

        if (owner === actor) {
            database.query(
                "SELECT DISTINCT userId FROM comments WHERE postId = ? AND userId != ?",
                [post, actor],
                (err, rows) => {
                    if (err || !rows) {
                        return;
                    }
                    rows.forEach((row) => {
                        const otherId = parseInt(row.userId, 10);
                        if (otherId && otherId !== actor) {
                            createNotification({
                                userId: otherId,
                                actorId: actor,
                                type: "comment",
                                postId: post,
                                message: "commented on your post",
                            });
                        }
                    });
                }
            );
        }
    });
}

module.exports = {
    createNotification,
    getPostOwnerId,
    maybeCreateLikeMilestoneNotification,
    notifyCommentActivity,
    LIKE_MILESTONES,
};
