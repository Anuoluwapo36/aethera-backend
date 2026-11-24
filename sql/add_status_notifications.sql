-- Run once in MySQL Workbench on aethera_db (after create_statuses.sql tables exist)
USE aethera_db;

ALTER TABLE notifications ADD COLUMN statusId INT NULL AFTER postId;

ALTER TABLE notifications
MODIFY type ENUM('like', 'comment', 'follow', 'like_milestone', 'status_like') NOT NULL;
