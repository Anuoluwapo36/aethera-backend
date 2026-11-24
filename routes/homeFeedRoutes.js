const express = require("express");
const router = express.Router();
const homeController = require("../controllers/homeFeedController");

router.get("/homeFeed", homeController.getHomeFeed);

module.exports = router;
