const express = require("express");
const router = express.Router();
const commentsController = require("../controllers/commentsController");

router.post("/addComment", commentsController.addComment);
router.get("/getComments", commentsController.getCommentsForPost);
router.get("/commentsCount", commentsController.getCommentsCount);
module.exports = router;
