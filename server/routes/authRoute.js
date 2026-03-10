const express = require("express");
const router = express.Router();
const User = require("../models/User");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const bcrypt = require("bcryptjs");
const speakeasy = require("speakeasy");
const QRCode = require("qrcode");

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

router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(400).json({ message: "Email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const secret = speakeasy.generateSecret({
      name: `BlockchainCloudStorage (${email})`,
      length: 20
    });

    const user = new User({
      name,
      email,
      password: hashedPassword,
      otpSecret: secret.base32,
      otpEnabled: true
    });

    await user.save();

    const qrCode = await QRCode.toDataURL(secret.otpauth_url);

    res.status(201).json({
      message: "Registered successfully",
      qrCode,
      manualKey: secret.base32
    });

  } catch (err) {
    console.error("Register Error:", err);
    res.status(500).json({ message: "Registration failed" });
  }
});

/* ================= LOGIN ================= */

router.post("/login", async (req, res) => {
  try {
    const { email, password, otp } = req.body;

    const user = await User.findOne({ email });
    if (!user)
      return res.status(401).json({ message: "Invalid email or password" });

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword)
      return res.status(401).json({ message: "Invalid email or password" });

    // ✅ OTP verification only if enabled
    if (user.otpEnabled && user.otpSecret) {

      if (!otp)
        return res.status(401).json({ message: "OTP required" });

      const verified = speakeasy.totp.verify({
        secret: user.otpSecret,
        encoding: "base32",
        token: otp,
        window: 1
      });

      if (!verified)
        return res.status(401).json({ message: "Invalid OTP" });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({ token });

  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/* ===================================================
   FORGOT PASSWORD → SEND OTP
=================================================== */

router.post("/forgot", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email)
      return res.status(400).json({ message: "Email is required" });

    const user = await User.findOne({ email });

    if (!user) {
      return res.json({ message: "If this email exists, OTP was sent" });
    }

    if (user.resetOTPExpire && user.resetOTPExpire > Date.now() - 60000) {
      return res.status(429).json({
        message: "Please wait before requesting another OTP"
      });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    user.resetOTP = otp;
    user.resetOTPExpire = Date.now() + 10 * 60 * 1000;

    await user.save();

    await transporter.sendMail({
      to: email,
      subject: "Password Reset OTP",
      html: `
        <h2>Your OTP: ${otp}</h2>
        <p>This OTP is valid for 10 minutes.</p>
      `
    });

    res.json({ message: "OTP sent to email" });

  } catch (err) {
    console.error("Forgot Password Error:", err);
    res.status(500).json({ message: "Failed to send OTP" });
  }
});

/* ===================================================
   VERIFY OTP & RESET PASSWORD
=================================================== */

router.post("/reset", async (req, res) => {
  try {
    const { email, otp, password } = req.body;

    if (!email || !otp || !password) {
      return res.status(400).json({ message: "All fields required" });
    }

    if (password.length < 6) {
      return res.status(400).json({
        message: "Password must be at least 6 characters"
      });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.json({ message: "If details are correct, password updated" });
    }

    if (!user.resetOTP || !user.resetOTPExpire) {
      return res.status(400).json({ message: "OTP not requested" });
    }

    if (user.resetOTPExpire < Date.now()) {
      return res.status(400).json({ message: "OTP expired" });
    }

    if (String(user.resetOTP) !== String(otp)) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);

    user.resetOTP = undefined;
    user.resetOTPExpire = undefined;

    await user.save();

    res.json({ message: "Password reset successful" });

  } catch (err) {
    console.error("Reset Error:", err);
    res.status(500).json({ message: "Reset failed" });
  }
});

module.exports = router;