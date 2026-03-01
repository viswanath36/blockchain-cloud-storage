const jwt = require("jsonwebtoken");

module.exports = function (req, res, next) {
  try {
    // token can come from header OR query (for downloads)
    let token =
      req.headers.authorization?.split(" ")[1] ||
      req.query.token;

    if (!token) {
      return res.status(401).json({ message: "Access denied. No token." });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // attach user info to request
    req.user = decoded;

    next();

  } catch (err) {
    console.log("AUTH ERROR:", err.message);
    res.status(401).json({ message: "Invalid token" });
  }
};