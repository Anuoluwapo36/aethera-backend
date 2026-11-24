const express = require("express");

const router = express.Router();

const postController = require("../controllers/postController");

const multer = require("multer");

const path = require("path");



const storage = multer.diskStorage({

    destination: (req, file, cb) => cb(null, "uploads/posts/"),

    filename: (req, file, cb) => {

        const name = Date.now() + "-" + Math.random() + path.extname(file.originalname);

        cb(null, name);

    },

});



const upload = multer({storage});



router.post("/createPost", upload.array("image", 10), postController.createPost);



router.get(`/user/:userId`, postController.getUserPost);

router.post(`/like`, postController.likePost);

router.post(`/unlike`, postController.unlikePost);

router.get(`/isLiked`, postController.checkUserLikedPost);

router.get(`/postDetails/:postId`, postController.getPostDetails);

router.post(`/deletePost`, postController.deletePost);



module.exports = router;

