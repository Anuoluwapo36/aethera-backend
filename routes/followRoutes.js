const express = require("express");
const router = express.Router();
const followController = require("../controllers/followController");

router.post("/follow", followController.followUser);
router.get("/isFollowing/:followerId/:followingId", followController.checkIsFollowing);
router.get("/followers/:userId", followController.getFollowersCount);
router.get("/following/:userId", followController.getFollowingCount);

module.exports = router;
