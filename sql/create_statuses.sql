-- Run once in MySQL Workbench on aethera_db
USE aethera_db;

CREATE TABLE IF NOT EXISTS statuses (
    statusId INT AUTO_INCREMENT PRIMARY KEY,
    userId INT NOT NULL,
    mediaUri VARCHAR(512) NOT NULL,
    mediaType ENUM('image') NOT NULL DEFAULT 'image',
    caption VARCHAR(500) NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expiresAt TIMESTAMP NOT NULL,
    INDEX idx_status_user_expires (userId, expiresAt),
    INDEX idx_status_expires (expiresAt),
    FOREIGN KEY (userId) REFERENCES users(userId) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS status_views (
    statusId INT NOT NULL,
    viewerId INT NOT NULL,
    viewedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (statusId, viewerId),
    FOREIGN KEY (statusId) REFERENCES statuses(statusId) ON DELETE CASCADE,
    FOREIGN KEY (viewerId) REFERENCES users(userId) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS status_like (
    statusId INT NOT NULL,
    userId INT NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (statusId, userId),
    FOREIGN KEY (statusId) REFERENCES statuses(statusId) ON DELETE CASCADE,
    FOREIGN KEY (userId) REFERENCES users(userId) ON DELETE CASCADE
);

-- Optional: add statusId to notifications (skip if column already exists)
-- ALTER TABLE notifications ADD COLUMN statusId INT NULL AFTER postId;
-- ALTER TABLE notifications MODIFY type ENUM('like','comment','follow','like_milestone','status_like') NOT NULL;
