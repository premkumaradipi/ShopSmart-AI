
const jwt = require("jsonwebtoken");
const db = require("../database/db");

// Verify the customer's login token
function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      message: "Please log in to continue.",
    });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const customer = db
      .prepare(
        `SELECT customer_id, full_name, email, role
         FROM customers
         WHERE customer_id = ?`
      )
      .get(decoded.customerId);

    if (!customer) {
      return res.status(401).json({
        message: "Customer account not found.",
      });
    }

    req.user = customer;
    next();
  } catch (error) {
    return res.status(401).json({
      message: "Invalid or expired login token.",
    });
  }
}

// Allow only authenticated administrators
function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({
      message: "Administrator access required.",
    });
  }

  next();
}

module.exports = {
  authenticateToken,
  requireAdmin,
};
