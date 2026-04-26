const express = require("express");
const { signup, login, verifyOtp } = require("../controllers/adminAuthController");

const router = express.Router();

router.get("/signup", signup); // done

router.get("/login", login) // step 1 - login, request otp on email
router.get("verify-otp", verifyOtp)  // step 2 - login, verify the email + otp & generate jwt

module.exports = router;
