const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");

router.post("/login", authController.login);
router.post("/register", authController.register);
router.post("/checkEmail", authController.checkEmail);
router.post("/verifyCode", authController.verifyCode);
router.post("/resetPassword", authController.resetPassword);

module.exports = router;
