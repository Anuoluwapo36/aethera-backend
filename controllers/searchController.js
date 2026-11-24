const database = require("../config/db");

const searchUsers = (req, res) => {
    const userId = req.query.userId;
    const query = req.query.query || "";
    const searchTerms = `%${query}%`;

    const searchQuery = `SELECT u.userId, u.username, u.fullname, u.profile_image AS image_uri,
    (SELECT COUNT(*) FROM follows f WHERE f.followerId = ? AND f.followingId = u.userId) AS isFollowing
    FROM users u
    WHERE u.username LIKE ? OR u.fullname LIKE ?
    GROUP BY u.userId
    ORDER BY u.username ASC
    LIMIT 20`;

    database.query(searchQuery, [userId, searchTerms, searchTerms], (err, results) => {
        if (err) {
            return res.json({success: false, message: "unable to search users"});
        }

        if (results.length === 0) {
            return res.json({success: true, data: [], message: "no users found"});
        }

        res.json({success: true, data: results});
    });
};

const discoverUsers = (req, res) => {
    const userId = Number(req.query.userId);

    if (!userId) {
        return res.json({success: false, message: "userId required", data: []});
    }

    const discoverQuery = `
        SELECT u.userId,
               u.username,
               u.fullname,
               u.profile_image AS image_uri,
               0 AS isFollowing,
               (SELECT COUNT(*) FROM follows f WHERE f.followingId = u.userId) AS followerCount
        FROM users u
        WHERE u.userId != ?
          AND NOT EXISTS (
              SELECT 1 FROM follows f
              WHERE f.followerId = ? AND f.followingId = u.userId
          )
        ORDER BY followerCount DESC, u.username ASC
        LIMIT 15
    `;

    database.query(discoverQuery, [userId, userId], (err, results) => {
        if (err) {
            return res.json({success: false, message: "unable to load suggestions", data: []});
        }

        res.json({
            success: true,
            message: results.length === 0 ? "no suggestions yet" : "suggested for you",
            data: results,
        });
    });
};

module.exports = {searchUsers, discoverUsers};
