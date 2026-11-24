const express = require("express");

const router = express.Router();

const fs = require("fs");

const path = require("path");

const multer = require("multer");

const statusController = require("../controllers/statusController");



const uploadDir = path.join(__dirname, "..", "uploads", "statuses");

if (!fs.existsSync(uploadDir)) {

    fs.mkdirSync(uploadDir, {recursive: true});

}



const storage = multer.diskStorage({

    destination: (req, file, cb) => cb(null, uploadDir),

    filename: (req, file, cb) => {

        const name = Date.now() + "-" + Math.random() + path.extname(file.originalname);

        cb(null, name);

    },

});



const upload = multer({storage});



router.post("/createStatus", upload.single("image"), statusController.createStatus);

router.get("/statusFeed", statusController.getStatusFeed);

router.get("/statuses/user/:userId", statusController.getUserStatuses);

router.post("/status/view", statusController.markStatusViewed);

router.post("/status/like", statusController.likeStatus);

router.post("/status/unlike", statusController.unlikeStatus);

router.post("/deleteStatus", statusController.deleteStatus);



module.exports = router;

