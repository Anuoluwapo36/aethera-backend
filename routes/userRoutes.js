const express = require("express");
const routes = express.Router();
const userController = require("../controllers/userController");
const multer = require("multer");
const path = require("path");

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, "uploads/profileImage/"),
    filename: (req, file, cb) => {
        const name = Date.now() + "-" + Math.random() + path.extname(file.originalname);
        cb(null, name);
    },
});

const upload = multer({storage});

routes.get(`/userDetails/:userId`, userController.userDetails);
routes.put(`/updateUserDetails/:userId`, userController.updateUserDetails);
routes.put(`/uploadProfilePicture/:userId`, upload.single("profileImage"), userController.uploadProfilePicture);

module.exports = routes;
