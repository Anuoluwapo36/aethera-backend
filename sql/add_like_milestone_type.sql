-- Run once in MySQL Workbench on aethera_db (needed for 100+ like milestone notifications)
USE aethera_db;

ALTER TABLE notifications
MODIFY type ENUM('like', 'comment', 'follow', 'like_milestone') NOT NULL;
