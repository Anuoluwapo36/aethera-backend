const database = require("../config/db");

const FEED_SELECT = `
    SELECT 
        p.*,
        u.username,
        u.fullname,
        u.profile_image,
        GROUP_CONCAT(pi.imageUri) AS all_images,
        (SELECT COUNT(*) FROM post_like pl WHERE pl.postId = p.postId) AS likeCount,
        (SELECT COUNT(*) FROM comments c WHERE c.postId = p.postId) AS commentCount,
        CASE 
            WHEN EXISTS (
                SELECT 1 FROM post_like pl2 
                WHERE pl2.postId = p.postId AND pl2.userId = ?
            ) THEN 1 
            ELSE 0 
        END AS isLiked,
        CASE
            WHEN p.userId = ? THEN 0
            WHEN EXISTS (
                SELECT 1 FROM follows f
                WHERE f.followerId = ? AND f.followingId = p.userId
            ) THEN 1
            ELSE 0
        END AS isFollowing,
        CASE
            WHEN p.userId = ? THEN 0
            WHEN EXISTS (
                SELECT 1 FROM follows f
                WHERE f.followerId = ? AND f.followingId = p.userId
            ) THEN 1
            ELSE 2
        END AS feedTier,
        CASE
            WHEN EXISTS (
                SELECT 1 FROM post_like pl4
                WHERE pl4.postId = p.postId AND pl4.userId = ?
            ) THEN 1
            WHEN EXISTS (
                SELECT 1 FROM comments c3
                WHERE c3.postId = p.postId AND c3.userId = ?
            ) THEN 1
            ELSE 0
        END AS youEngaged,
        CASE WHEN p.userId = ? THEN 1 ELSE 0 END AS isOwnPost,
        CASE
            WHEN EXISTS (
                SELECT 1 FROM post_like pl_author
                INNER JOIN posts p_liked ON p_liked.postId = pl_author.postId
                WHERE pl_author.userId = ? AND p_liked.userId = p.userId
            ) THEN 1
            ELSE 0
        END AS authorAffinity
    FROM posts p
    LEFT JOIN post_image pi ON p.postId = pi.postId
    LEFT JOIN users u ON p.userId = u.userId
`;

const FEED_FROM = `
    GROUP BY p.postId
`;

function mapFeedRows(results) {
    return results.map((row) => ({
        ...row,
        followingStatus: Number(row.isFollowing) === 1 ? 1 : 0,
        isLiked: Number(row.isLiked) === 1 ? 1 : 0,
    }));
}

function selectParams(userId) {
    return [userId, userId, userId, userId, userId, userId, userId, userId, userId];
}

function otherUsersFilter() {
    return `
        p.userId != ?
        AND (
            EXISTS (
                SELECT 1 FROM follows f0
                WHERE f0.followerId = ? AND f0.followingId = p.userId
            )
            OR EXISTS (
                SELECT 1 FROM post_like pl_rec
                INNER JOIN posts p_rec ON p_rec.postId = pl_rec.postId
                WHERE pl_rec.userId = ? AND p_rec.userId = p.userId
            )
        )
    `;
}

const getHomeFeed = (req, res) => {
    const userId = parseInt(req.query.userId, 10);
    const page = parseInt(req.query.page, 10) || 1;
    const otherLimit = 20;
    const otherOffset = page === 1 ? 0 : (page - 2) * otherLimit + 20;

    if (!userId) {
        return res.json({
            success: false,
            message: "userId is required",
        });
    }

    const respond = (err, results) => {
        if (err) {
            console.error("ERROR:", err);
            return res.json({
                success: false,
                message: "Unable to load home feed",
            });
        }
        res.json({
            success: true,
            data: mapFeedRows(results),
        });
    };

    if (page === 1) {
        const ownQuery = `
            ${FEED_SELECT}
            WHERE p.userId = ?
            ${FEED_FROM}
            ORDER BY p.createAt DESC
        `;

        const otherQuery = `
            ${FEED_SELECT}
            WHERE ${otherUsersFilter()}
            ${FEED_FROM}
            ORDER BY feedTier ASC, authorAffinity DESC, youEngaged DESC, p.createAt DESC
            LIMIT ? OFFSET ?
        `;

        database.query(ownQuery, [...selectParams(userId), userId], (err1, ownResults) => {
            if (err1) {
                return respond(err1);
            }

            database.query(
                otherQuery,
                [...selectParams(userId), userId, userId, userId, 20, 0],
                (err2, otherResults) => {
                    if (err2) {
                        return respond(err2);
                    }
                    const merged = [...(ownResults || []), ...(otherResults || [])];
                    merged.sort((a, b) => new Date(b.createAt) - new Date(a.createAt));
                    respond(null, merged);
                }
            );
        });
        return;
    }

    const pagedOtherQuery = `
        ${FEED_SELECT}
        WHERE ${otherUsersFilter()}
        ${FEED_FROM}
        ORDER BY feedTier ASC, authorAffinity DESC, youEngaged DESC, p.createAt DESC
        LIMIT ? OFFSET ?
    `;

    database.query(
        pagedOtherQuery,
        [...selectParams(userId), userId, userId, userId, otherLimit, otherOffset],
        respond
    );
};

module.exports = {getHomeFeed};
