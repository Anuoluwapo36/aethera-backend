const database = require("../config/db");

function ensureNotificationsTable() {
    const createSql = `
        CREATE TABLE IF NOT EXISTS notifications (
            notificationId INT AUTO_INCREMENT PRIMARY KEY,
            userId INT NOT NULL,
            actorId INT NOT NULL,
            type ENUM('like', 'comment', 'follow') NOT NULL,
            postId INT NULL,
            message VARCHAR(255) NULL,
            isRead TINYINT(1) DEFAULT 0,
            createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_notifications_user (userId),
            INDEX idx_notifications_created (createdAt)
        )
    `;

    database.query(createSql, (err) => {
        if (err) {
            console.error("notifications table setup failed:", err.message);
            return;
        }
        console.log("notifications table ready");
    });
}

module.exports = ensureNotificationsTable;
