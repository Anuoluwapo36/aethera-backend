const express = require("express");
const router = express.Router();
const searchController = require("../controllers/searchController");

router.get("/search", searchController.searchUsers);
router.get("/discover", searchController.discoverUsers);

module.exports = router;
