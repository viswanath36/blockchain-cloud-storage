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

    // ✅ Validate input
    if (!name || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // ✅ Check if email already exists
    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(400).json({ message: "Email already exists" });
    }

    // ✅ Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // ✅ Generate Google Authenticator secret
    const secret = speakeasy.generateSecret({
      name: `BlockchainCloudStorage (${email})`
    });

    // ✅ Create user
    const user = new User({
      name,
      email,
      password: hashedPassword,
      otpSecret: secret.base32,
      otpEnabled: true   // ⭐ ensures OTP is enforced
    });

    await user.save();

    // ✅ Generate QR Code for Google Authenticator
    const qrCode = await QRCode.toDataURL(secret.otpauth_url);

    res.status(201).json({
      message: "Registered successfully",
      qrCode
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

    // ✅ find user
    const user = await User.findOne({ email });
    if (!user)
      return res.status(401).json({ message: "Invalid email or password" });

    // ✅ verify password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword)
      return res.status(401).json({ message: "Invalid email or password" });

    // ✅ verify OTP only if secret exists
    if (user.otpSecret) {

      if (!otp)
        return res.status(401).json({ message: "OTP required" });

      const verified = speakeasy.totp.verify({
        secret: user.otpSecret,
        encoding: "base32",
        token: otp,
        window: 1   // handles time delay
      });

      if (!verified)
        return res.status(401).json({ message: "Invalid OTP" });
    }

    // ✅ create JWT token
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,   // ⭐ important
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

    // ✅ security: don't reveal if user exists
    if (!user) {
      return res.json({ message: "If this email exists, OTP was sent" });
    }

    // ✅ prevent OTP spam (allow new OTP after 60 sec)
    if (user.resetOTPExpire && user.resetOTPExpire > Date.now() - 60000) {
      return res.status(429).json({
        message: "Please wait before requesting another OTP"
      });
    }

    // ✅ generate 6 digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    user.resetOTP = otp;
    user.resetOTPExpire = Date.now() + 10 * 60 * 1000; // 10 minutes

    await user.save();

    // ✅ send email
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

    // ✅ optional: password strength check
    if (password.length < 6) {
      return res.status(400).json({
        message: "Password must be at least 6 characters"
      });
    }

    const user = await User.findOne({ email });

    // ✅ security: avoid email enumeration
    if (!user) {
      return res.json({ message: "If details are correct, password updated" });
    }

    // ✅ ensure OTP exists
    if (!user.resetOTP || !user.resetOTPExpire) {
      return res.status(400).json({ message: "OTP not requested" });
    }

    // ✅ check expiry
    if (user.resetOTPExpire < Date.now()) {
      return res.status(400).json({ message: "OTP expired" });
    }

    // ✅ compare as string
    if (String(user.resetOTP) !== String(otp)) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    // ✅ hash new password
    const bcrypt = require("bcryptjs");
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);

    // ✅ clear OTP fields
    user.resetOTP = undefined;
    user.resetOTPExpire = undefined;

    await user.save();

    res.json({ message: "Password reset successful" });

  } catch (err) {
    console.error("Reset Error:", err);
    res.status(500).json({ message: "Reset failed" });
  }
});