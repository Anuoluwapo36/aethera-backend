-- Matches the schema you already have in aethera_db.
USE aethera_db;

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
);
