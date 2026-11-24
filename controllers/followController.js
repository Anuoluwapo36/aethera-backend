const database = require("../config/db");
const {createNotification} = require("../utils/notificationHelper");

const followUser = (req, res) => {
    const {followerId, followingId} = req.body;

    if (followerId === followingId) {
        return res.json({
            success: false,
            message: "You cannot follow yourself",
        });
    }

    const checkFollowQuery = "SELECT * FROM follows WHERE followerId = ? AND followingId = ?";
    database.query(checkFollowQuery, [followerId, followingId], (err, results) => {
        if (err) {
            return res.json({
                success: false,
                message: "Unable to check follow status",
            });
        }

        if (results.length > 0) {
            const unfollowQuery = "DELETE FROM follows WHERE followerId = ? AND followingId = ?";
            database.query(unfollowQuery, [followerId, followingId], (err, result) => {
                if (err) {
                    return res.json({
                        success: false,
                        message: "Unable to unfollow user",
                    });
                }
                res.json({
                    success: true,
                    message: "User unfollowed successfully",
                    action: "unfollow",
                });
            });
        } else {
            const followQuery = "INSERT INTO follows (followerId, followingId) VALUES (?, ?)";
            database.query(followQuery, [followerId, followingId], (err, result) => {
                if (err) {
                    return res.json({
                        success: false,
                        message: "Unable to follow user",
                    });
                }
                res.json({
                    success: true,
                    message: "User followed successfully",
                    action: "follow",
                });

                createNotification({
                    userId: followingId,
                    actorId: followerId,
                    type: "follow",
                    postId: null,
                    message: "started following you",
                });
            });
        }
    });
};

const checkIsFollowing = (req, res) => {
    const {followerId, followingId} = req.params;

    const query = "SELECT * FROM follows WHERE followerId = ? AND followingId = ?";
    database.query(query, [followerId, followingId], (err, results) => {
        if (err) {
            return res.json({success: false, following: false});
        }
        res.json({
            success: true,
            following: results.length > 0,
        });
    });
};

const getFollowersCount = (req, res) => {
    const {userId} = req.params;
    const query = "SELECT COUNT(*) AS count FROM follows WHERE followingId = ?";
    database.query(query, [userId], (err, result) => {
        if (err) return res.json({success: false, count: 0});
        res.json({success: true, count: Number(result[0].count) || 0});
    });
};

const getFollowingCount = (req, res) => {
    const {userId} = req.params;
    const query = "SELECT COUNT(*) AS count FROM follows WHERE followerId = ?";
    database.query(query, [userId], (err, result) => {
        if (err) return res.json({success: false, count: 0});
        res.json({success: true, count: Number(result[0].count) || 0});
    });
};

module.exports = {followUser, checkIsFollowing, getFollowersCount, getFollowingCount};
