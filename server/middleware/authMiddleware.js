const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
  let token = null;

  const authHeader = req.header("Authorization");
  if (authHeader) {
    token = authHeader.replace("Bearer ", "");
  }

  // allow token in URL for downloads
  if (!token && req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({ message: "No token provided" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // ✅ FIX: support your current token structure
    req.user = {
      id: decoded.id,
      role: decoded.role
    };

    next();
  } catch (err) {
    return res.status(403).json({ message: "Access denied" });
  }
};