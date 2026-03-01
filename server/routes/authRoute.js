const express = require("express");
const router = express.Router();
const User = require("../models/User");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");

const SECRET = process.env.JWT_SECRET;

/* ================= EMAIL CONFIG ================= */

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

/* ================= REGISTER ================= */

const bcrypt = require("bcryptjs");
const speakeasy = require("speakeasy");
const QRCode = require("qrcode");


// ================= REGISTER =================
router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // ✅ validation
    if (!name || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // ✅ check existing user
    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(400).json({ message: "Email already exists" });
    }

    // ✅ HASH PASSWORD (SECURE)
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // ✅ generate Google Authenticator secret
    const secret = speakeasy.generateSecret({
      name: "BlockchainCloudStorage"
    });

    // ✅ save user
    const user = new User({
      name: email.split("@")[0],   // auto name
      email,
      password: hashedPassword,
      otpSecret: secret.base32,
    });

    await user.updateOne({resetOTP: otp, resetOTPExpire: Date.now() + 60000});

    // ✅ generate QR code for authenticator
    const qrCode = await QRCode.toDataURL(secret.otpauth_url);

    res.json({
      message: "Registered successfully",
      qrCode
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Registration failed" });
  }
});

/* ================= LOGIN ================= */

router.post("/login", async (req, res) => {
  try {
    const { email, password, otp } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // OTP check if enabled
    if (user.otpEnabled) {
      const speakeasy = require("speakeasy");

      const verified = speakeasy.totp.verify({
        secret: user.otpSecret,
        encoding: "base32",
        token: otp
      });

      if (!verified) {
        return res.status(401).json({ message: "Invalid OTP" });
      }
    }

    const token = jwt.sign(
      { id: user._id, 
        role: user.role
       },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({ token });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;

/* ===================================================
   FORGOT PASSWORD → SEND OTP
=================================================== */

const crypto = require("crypto");

// send reset OTP
router.post("/forgot", async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user)
      return res.status(404).json({ message: "User not found" });

    // generate 6 digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    user.resetOTP = otp;
    user.resetOTPExpire = Date.now() + 10 * 60 * 1000; // 10 min

    await user.save();

    // email transporter
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      to: email,
      subject: "Password Reset OTP",
      html: `<h2>Your OTP: ${otp}</h2>
             <p>Valid for 10 minutes</p>`,
    });

    res.json({ message: "OTP sent to email" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to send OTP" });
  }
});

/* ===================================================
   VERIFY OTP & RESET PASSWORD
=================================================== */

router.post("/reset", async (req, res) => {
  try {
    const { email, otp, password } = req.body; // ✅ match frontend

    if (!email || !otp || !password) {
      return res.status(400).json({ message: "All fields required" });
    }

    const user = await User.findOne({ email });

    if (!user)
      return res.status(404).json({ message: "User not found" });

    if (!user.resetOTP || user.resetOTP !== otp)
      return res.status(400).json({ message: "Invalid OTP" });

    if (!user.resetOTPExpire || user.resetOTPExpire < Date.now())
      return res.status(400).json({ message: "OTP expired" });

    const bcrypt = require("bcryptjs");

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);

    // clear OTP after success
    user.resetOTP = undefined;
    user.resetOTPExpire = undefined;

    await user.save();

    res.json({ message: "Password reset successful" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Reset failed" });
  }
});