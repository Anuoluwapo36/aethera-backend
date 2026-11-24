const database = require("../config/db");
const {createNotification, getPostOwnerId, maybeCreateLikeMilestoneNotification} = require("../utils/notificationHelper");
/**
 * create post
 * @param {*} req
 * @param {*} res
 * @returns
 */
const createPost = (req, res) => {
    const {userId, caption} = req.body;

    if (!req.files || req.files.length === 0) {
        return res.json({success: false, message: "No image uploaded"});
    }

    const postQuery = "INSERT INTO posts (userId , caption) Values(?,?)";
    database.query(postQuery, [userId, caption], (err, result) => {
        if (err) return res.json({success: false, message: "failed to post"});

        const newPostId = result.insertId;

        if (!req.files || req.files.length === 0) {
            return res.json({success: false, message: "posted no image"});
        }

        const imageValues = req.files.map((file) => [userId, newPostId, "uploads/posts/" + file.filename]);

        const imageQuery = "INSERT INTO post_image (userId, postId, imageUri) VALUES ?";
        database.query(imageQuery, [imageValues], (err2) => {
            if (err2) {
                return res.json({success: false, message: "failed to save image"});
            }
            res.json({
                success: true,
                message: "post created successfully",
            });
        });
    });
};
/**
 * fetching all post that belong to a user by id
 * group all image  that belong to one id together
 * @param {*} req
 * @param {*} res
 */
const getUserPost = (req, res) => {
    const userId = req.params.userId;

    const getPostQuery = `SELECT p.*, 
    GROUP_CONCAT(pi.imageUri) AS all_images 
    FROM posts p 
    LEFT JOIN post_image pi 
    ON p.postId = pi.postId 
    WHERE p.userId = ? 
    GROUP BY p.postId`;
    database.query(getPostQuery, [userId], (err, results) => {
        if (err) {
            return res.json({success: false, message: "unable to get user post"});
        }
        res.json({success: true, data: results});
    });
};

/**
 * like a post
 *and return the new like count after liking the post
 * the user can only like a post once by providing his id and the post id in the request body
 * if the user already liked the post before it will return a message saying that the user already liked the post before
 * if the user successfully liked the post it will return a message saying that the post is liked and the new like count for that post
 * @param {*} req
 * @param {*} res
 */
const likePost = (req, res) => {
    const userId = parseInt(req.body.userId, 10);
    const postId = parseInt(req.body.postId, 10);

    if (!userId || !postId) {
        return res.json({success: false, message: "userId and postId are required"});
    }

    const likeQuery = "INSERT INTO post_like (userId, postId) VALUES (?, ?)";
    database.query(likeQuery, [userId, postId], (err, result) => {
        if (err) {
            return res.json({success: false, message: "failed to like post"});
        }

        const countLikes = "SELECT COUNT(*) AS likeCount FROM post_like WHERE postId = ?";
        database.query(countLikes, [postId], (err2, countResult) => {
            if (err2) {
                return res.json({success: false, message: "failed to count likes"});
            }

            const likeCount = countResult[0].likeCount;

            getPostOwnerId(postId, (ownerErr, ownerId) => {
                if (!ownerErr && ownerId) {
                    createNotification({
                        userId: ownerId,
                        actorId: userId,
                        type: "like",
                        postId,
                        message: "liked your post",
                    });
                    maybeCreateLikeMilestoneNotification(ownerId, postId, likeCount);
                }

                res.json({success: true, message: "post liked", likeCount});
            });
        });
    });
};

/**
 * unlike a post
 * and return the new like count after unliking the post
 * the user can only unlike a post that he liked before by providing his id and the post id in the request body
 * if the user did not like the post before it will return a message saying that the user did not like the post before
 * if the user successfully unliked the post it will return a message saying that the post is unliked and the new like count for that post
 * @param {*} req
 * @param {*} res
 */
const unlikePost = (req, res) => {
    const {userId, postId} = req.body;

    const unlikeQuery = "DELETE FROM post_like WHERE userId = ? AND postId = ?";
    database.query(unlikeQuery, [userId, postId], (err, result) => {
        if (err) {
            return res.json({success: false, message: "failed to unlike post"});
        }

        const countQuery = "SELECT COUNT(*) AS likeCount FROM post_like WHERE postId = ?";
        database.query(countQuery, [postId], (err2, countResult) => {
            if (err2) {
                return res.json({success: false, message: "failed to count likes"});
            }
            res.json({success: true, message: "post unliked", likeCount: countResult[0].likeCount});
        });
    });
};

const checkUserLikedPost = (userId, postId, callback) => {
    const checkQuery = "SELECT * FROM post_like WHERE userId = ? AND postId = ?";
    database.query(checkQuery, [userId, postId], (err, result) => {
        if (err) {
            return callback(err, null);
        }
        callback(null, result.length > 0);
    });
};

/**
 * get post details by post id
 * it will return the post details along with all images that belong to that post and the like count for that post and if the user liked the post or not
 * the user id is passed as a query parameter to check if the user liked the post or not
 * if the post is not found it will return a message saying that the post is not found
 * if there is an error it will return a message saying that it is unable to get post details
 * if the post is found it will return the post details along with all images that belong to that post and the like count for that post and if the user liked the post or not
 * @param {*} req
 * @param {*} res
 */
const getPostDetails = (req, res) => {
    const postId = req.params.postId;
    const userId = req.query.userId; // Assuming userId is passed as a query parameter

    // const postDetailsQuery = `SELECT p.*,
    // GROUP_CONCAT(pi.imageUri) AS all_images,
    // (SELECT COUNT(*) FROM post_like pl WHERE pl.postId = p.postId) AS likeCount,
    // CASE WHEN EXISTS (SELECT 1 FROM post_like pl2 WHERE pl2.postId = p.postId AND pl2.userId = ?)
    //     THEN 1 ELSE 0 END AS isLiked
    // FROM posts p
    // LEFT JOIN post_image pi ON p.postId = pi.postId
    // WHERE p.postId = ?
    // GROUP BY p.postId`;

    const postDetailsQuery = `
        SELECT p.*, 
        GROUP_CONCAT(pi.imageUri) AS all_images,
        (SELECT COUNT(*) FROM post_like pl WHERE pl.postId = p.postId) AS likeCount,
        (SELECT COUNT(*) FROM comments c WHERE c.postId = p.postId) AS commentCount,  
        CASE WHEN EXISTS (SELECT 1 FROM post_like pl2 WHERE pl2.postId = p.postId AND pl2.userId = ?)
            THEN 1 ELSE 0 END AS isLiked
        FROM posts p 
        LEFT JOIN post_image pi ON p.postId = pi.postId 
        WHERE p.postId = ? 
        GROUP BY p.postId
    `;

    database.query(postDetailsQuery, [userId, postId], (err, results) => {
        if (err) {
            return res.json({success: false, message: "unable to get post details"});
        }
        if (results.length === 0) {
            return res.json({success: false, message: "post not found"});
        }
        res.json({success: true, data: results[0]});
    });
};

const deletePost = (req, res) => {
    const postId = parseInt(req.body.postId, 10);
    const userId = parseInt(req.body.userId, 10);

    console.log("DELETE POST request:", {postId, userId});

    if (!postId || !userId) {
        return res.json({success: false, message: "postId and userId are required"});
    }

    database.query("SELECT userId FROM posts WHERE postId = ?", [postId], (err, rows) => {
        if (err) {
            return res.json({success: false, message: "Unable to delete post"});
        }
        if (!rows.length) {
            return res.json({success: false, message: "Post not found"});
        }

        const ownerId = parseInt(rows[0].userId, 10);
        if (ownerId !== userId) {
            return res.json({success: false, message: "You can only delete your own posts"});
        }

        const cleanupSteps = [
            {sql: "DELETE FROM notifications WHERE postId = ?", params: [postId], optional: true},
            {sql: "DELETE FROM post_like WHERE postId = ?", params: [postId]},
            {sql: "UPDATE comments SET reply_to = NULL WHERE postId = ?", params: [postId], optional: true},
            {sql: "DELETE FROM comments WHERE postId = ?", params: [postId]},
            {sql: "DELETE FROM post_image WHERE postId = ?", params: [postId]},
            {sql: "DELETE FROM posts WHERE postId = ? AND userId = ?", params: [postId, userId]},
        ];

        const runStep = (index) => {
            if (index >= cleanupSteps.length) {
                return res.json({success: true, message: "Post deleted successfully"});
            }

            const step = cleanupSteps[index];
            database.query(step.sql, step.params, (stepErr) => {
                if (stepErr) {
                    console.error("Delete post step failed:", step.sql, stepErr.message);
                    if (step.optional) {
                        return runStep(index + 1);
                    }
                    return res.json({success: false, message: "Unable to delete post"});
                }
                runStep(index + 1);
            });
        };

        runStep(0);
    });
};

module.exports = {createPost, getUserPost, likePost, unlikePost, checkUserLikedPost, getPostDetails, deletePost};
