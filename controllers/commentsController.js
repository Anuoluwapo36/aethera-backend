const database = require("../config/db");
const {notifyCommentActivity} = require("../utils/notificationHelper");

function parseReplyTo(raw) {
    if (raw == null) {
        return null;
    }
    const text = String(raw).trim();
    if (!text || text === "null" || text === "undefined" || text === "-1" || text === "0") {
        return null;
    }
    const id = parseInt(text, 10);
    return Number.isFinite(id) && id > 0 ? id : null;
}

function notifyAfterCommentInsert({postId, actorId, replyToId, insertId}) {
    if (replyToId) {
        notifyCommentActivity({postId, actorId, replyTo: replyToId});
        return;
    }

    if (!insertId) {
        notifyCommentActivity({postId, actorId, replyTo: null});
        return;
    }

    database.query(
        "SELECT reply_to FROM comments WHERE commentId = ? AND postId = ?",
        [insertId, postId],
        (lookupErr, rows) => {
            let savedReplyTo = null;
            if (!lookupErr && rows.length && rows[0].reply_to != null) {
                savedReplyTo = parseReplyTo(rows[0].reply_to);
            }
            notifyCommentActivity({postId, actorId, replyTo: savedReplyTo});
        }
    );
}

/**
 * Add a new comment to a post
 * The comment details are received in the request body, including postId, userId, comment text, and an optional reply_to field if the comment is a reply to another comment
 * The comment is inserted into the comments table in the database
 * If the insertion is successful, a success response is returned; otherwise, an error response is sent back
 * @param {*} req
 * @param {*} res
 * @returns
 */
const addComment = (req, res) => {
    const postId = parseInt(req.body.postId, 10);
    const actorId = parseInt(req.body.userId, 10);
    const {comment} = req.body;
    const replyToId = parseReplyTo(req.body.reply_to);

    const insertCommentQuery = `
        INSERT INTO comments (postId, userId, comment, reply_to) 
        VALUES (?, ?, ?, ?)
    `;
    if (!postId || !actorId || !comment) {
        return res.status(400).json({
            success: false,
            message: "postId, userId, and comment are required",
        });
    }
    database.query(insertCommentQuery, [postId, actorId, comment, replyToId], (err, result) => {
        if (err) {
            console.error("ERROR:", err);
            return res.status(500).json({
                success: false,
                message: "Unable to add comment",
            });
        }

        notifyAfterCommentInsert({
            postId,
            actorId,
            replyToId,
            insertId: result.insertId,
        });
        console.log(
            `addComment saved post=${postId} actor=${actorId} replyTo=${replyToId != null ? replyToId : "none"} commentId=${result.insertId}`
        );

        return res.json({
            success: true,
            message: "Comment added successfully",
            commentId: result.insertId,
            reply_to: replyToId,
        });
    });
};
/**
 * Get comments for a specific post and return them in the response
 * The response includes comment details along with the user information of the commenter
 * The comments are fetched by joining the comments table with the users table to get the username and profile image of the commenter
 * The postId is passed as a query parameter in the request
 * The response includes an array of comments, where each comment contains the commentId, comment text, reply_to (if it's a reply to another comment), createAt timestamp, userId, username, and profile_image of the commenter
 * @param {*} req
 * @param {*} res
 * @returns
 */
const getCommentsForPost = (req, res) => {
    const postId = req.query.postId;
    if (!postId) {
        return res.status(400).json({
            success: false,
            message: "postId is required",
        });
    }

    const getCommentsQuery = `
        SELECT 
            c.commentId,
            c.postId,
            c.comment,
            c.reply_to,
            c.createAt,
            c.userId,
            u.username,
            u.profile_image 
            FROM comments c
            JOIN users u ON c.userId = u.userId
            WHERE c.postId = ?
            ORDER BY c.createAt DESC
    `;

    database.query(getCommentsQuery, [postId], (err, results) => {
        if (err) {
            console.error("ERROR:", err);
            return res.status(500).json({
                success: false,
                message: "Unable to fetch comments",
            });
        }
        const comments = (results || []).map((row) => ({
            commentId: Number(row.commentId),
            postId: Number(row.postId),
            userId: Number(row.userId),
            comment: row.comment,
            reply_to: row.reply_to != null ? Number(row.reply_to) : null,
            createAt: row.createAt,
            username: row.username,
            profile_image: row.profile_image,
        }));

        return res.json({
            success: true,
            comments,
        });
    });
};
/**
 * Get the count of comments for a specific post
 * and return it in the response
 *
 * @param {*} req
 * @param {*} res
 * @returns
 */
const getCommentsCount = (req, res) => {
    const postId = req.query.postId;
    if (!postId) {
        return res.status(400).json({
            success: false,
            message: "postId is required",
        });
    }

    const countCommentsQuery = `
        SELECT COUNT(*) AS commentCount
        FROM comments
        WHERE postId = ?
    `;

    database.query(countCommentsQuery, [postId], (err, results) => {
        if (err) {
            return res.status(500).json({
                success: false,
            });
        }
        return res.json({
            success: true,
            commentCount: results[0].commentCount,
        });
    });
};
module.exports = {addComment, getCommentsForPost, getCommentsCount};
