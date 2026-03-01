const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
{
  name: {
    type: String,
    required: true,
    trim: true,
    minlength: 2,
    default: "User"
  },

  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true
  },

  password: {
    type: String,
    required: true,
    minlength: 6
  },

  // 🔐 Google Authenticator secret
  otpSecret: {
    type: String,
    default: null
  },

  // 👑 Role Based Access Control
  role: {
    type: String,
    enum: ["user", "admin"],
    default: "user"
  },

  // 🔑 Forgot password OTP
  resetOTP: {
    type: String,
    default: null
  },

  resetOTPExpire: {
    type: Date,
    default: null
  }

},
{
  timestamps: true
}
);

// remove password when sending user data
UserSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.otpSecret;
  delete obj.resetOTP;
  delete obj.resetOTPExpire;
  return obj;
};

module.exports = mongoose.model("User", UserSchema);