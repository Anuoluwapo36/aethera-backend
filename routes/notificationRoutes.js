const express = require("express");
const router = express.Router();
const notificationController = require("../controllers/notificationController");

router.get("/notifications/:userId/unread-count", notificationController.getUnreadCount);
router.get("/notifications/:userId", notificationController.getNotifications);
router.put("/notifications/read/:notificationId", notificationController.markAsRead);
router.put("/notifications/:userId/read-all", notificationController.markAllAsRead);

module.exports = router;
