
require("dotenv").config();

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { randomUUID } = require("crypto");
const { authenticateToken, requireAdmin } = require("./middleware/auth");

if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET is missing from the .env file");
}

const express = require("express");
const cors = require("cors");
const db = require("./database/db");

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

/* CUSTOMER REGISTRATION */
app.post("/api/auth/register", (req, res) => {
  try {
    const { full_name, email, password } = req.body;

    if (
      typeof full_name !== "string" ||
      typeof email !== "string" ||
      typeof password !== "string"
    ) {
      return res.status(400).json({
        message: "Name, email, and password are required.",
      });
    }

    const name = full_name.trim();
    const normalizedEmail = email.trim().toLowerCase();

    if (name.length < 2 || name.length > 100) {
      return res.status(400).json({
        message: "Name must be between 2 and 100 characters.",
      });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return res.status(400).json({
        message: "Please enter a valid email address.",
      });
    }

    if (password.length < 8 || Buffer.byteLength(password, "utf8") > 72) {
      return res.status(400).json({
        message: "Password must be at least 8 characters and no more than 72 bytes.",
      });
    }

    const existingCustomer = db
      .prepare("SELECT customer_id FROM customers WHERE email = ?")
      .get(normalizedEmail);

    if (existingCustomer) {
      return res.status(409).json({
        message: "An account with this email already exists.",
      });
    }

    const customerId = `CUS-${randomUUID()}`;
    const passwordHash = bcrypt.hashSync(password, 12);

    db.prepare(`
      INSERT INTO customers
        (customer_id, full_name, email, password_hash)
      VALUES (?, ?, ?, ?)
    `).run(customerId, name, normalizedEmail, passwordHash);

    const token = jwt.sign(
      { customerId },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    return res.status(201).json({
      message: "Registration successful.",
      token,
      customer: {
        customer_id: customerId,
        full_name: name,
        email: normalizedEmail,
        role: "customer",
      },
    });
  } catch (error) {
    if (error.code === "SQLITE_CONSTRAINT_UNIQUE") {
      return res.status(409).json({
        message: "An account with this email already exists.",
      });
    }

    console.error("Registration error:", error.message);
    return res.status(500).json({
      message: "Unable to register right now.",
    });
  }
});

/* CUSTOMER LOGIN */
app.post("/api/auth/login", (req, res) => {
  try {
    const { email, password } = req.body;

    if (
      typeof email !== "string" ||
      typeof password !== "string"
    ) {
      return res.status(400).json({
        message: "Email and password are required.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const customer = db.prepare(`
      SELECT customer_id, full_name, email, password_hash, role
      FROM customers
      WHERE email = ?
    `).get(normalizedEmail);

    if (
      !customer ||
      !bcrypt.compareSync(password, customer.password_hash)
    ) {
      return res.status(401).json({
        message: "Invalid email or password.",
      });
    }

    const token = jwt.sign(
      { customerId: customer.customer_id },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    return res.json({
      message: "Login successful.",
      token,
      customer: {
        customer_id: customer.customer_id,
        full_name: customer.full_name,
        email: customer.email,
        role: customer.role,
      },
    });
  } catch (error) {
    console.error("Login error:", error.message);
    return res.status(500).json({
      message: "Unable to log in right now.",
    });
  }
});

/* CHECK CURRENT LOGIN */
app.get("/api/auth/me", authenticateToken, (req, res) => {
  res.json({ customer: req.user });
});

// Allowed order statuses
const allowedOrderStatuses = [
  "Order Confirmed",
  "Packed",
  "Shipped",
  "Out for Delivery",
  "Delivered",
  "Cancelled",
];

// Home API
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "ShopSmart-AI Order Management API is running!",
  });
});

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    service: "ShopSmart-AI Backend",
    status: "healthy",
    database: "connected",
  });
});

// CREATE DEMO ORDER
// Local development only; secure this before production.
app.post("/api/orders/demo", (req, res) => {
  const orderId = "SS" + Date.now();
  const customerId = "demo-customer-1";

  const order = {
    orderId,
    customerId,
    productId: 1,
    productName: "Men's Baggy Jeans",
    productImage: "/images/jeans/product-1.jpg",
    quantity: 1,
    totalAmount: 1499,
    paymentMethod: "COD",
    orderStatus: "Order Confirmed",
    estimatedDelivery: new Date(
      Date.now() + 5 * 24 * 60 * 60 * 1000
    )
      .toISOString()
      .slice(0, 10),
  };

  try {
    const createOrder = db.transaction(() => {
      db.prepare(`
        INSERT INTO orders (
          order_id, customer_id, product_id, product_name,
          product_image, quantity, total_amount, payment_method,
          order_status, estimated_delivery
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        order.orderId,
        order.customerId,
        order.productId,
        order.productName,
        order.productImage,
        order.quantity,
        order.totalAmount,
        order.paymentMethod,
        order.orderStatus,
        order.estimatedDelivery
      );

      db.prepare(`
        INSERT INTO order_status_history (
          order_id, status, note
        )
        VALUES (?, ?, ?)
      `).run(
        order.orderId,
        "Order Confirmed",
        "Your order has been confirmed."
      );
    });

    createOrder();

    res.status(201).json({
      success: true,
      message: "Demo order created successfully.",
      order,
    });
  } catch (error) {
    console.error("Demo order creation failed:", error.message);

    res.status(500).json({
      success: false,
      message: "Unable to create demo order.",
    });
  }
});

// LIST ORDERS FOR A CUSTOMER
// Development only: customerId is not authentication.
app.get("/api/orders", (req, res) => {
  const customerId = req.query.customerId;

  if (!customerId) {
    return res.status(400).json({
      success: false,
      message: "customerId is required.",
    });
  }

  const orders = db
    .prepare(`
      SELECT *
      FROM orders
      WHERE customer_id = ?
      ORDER BY created_at DESC
    `)
    .all(customerId);

  res.json({
    success: true,
    count: orders.length,
    orders,
  });
});

// GET ONE ORDER AND ITS TIMELINE
// Development only: add authenticated ownership checks before production.
app.get("/api/orders/:orderId", (req, res) => {
  const order = db
    .prepare("SELECT * FROM orders WHERE order_id = ?")
    .get(req.params.orderId);

  if (!order) {
    return res.status(404).json({
      success: false,
      message: "Order not found.",
    });
  }

  const timeline = db
    .prepare(`
      SELECT status, note, changed_at
      FROM order_status_history
      WHERE order_id = ?
      ORDER BY id ASC
    `)
    .all(order.order_id);

  res.json({
    success: true,
    order,
    timeline,
  });
});

// UPDATE ORDER STATUS
// Development only: restrict this operation to authorized administrators
// before production.
app.patch("/api/orders/:orderId/status", (req, res) => {
  const { status } = req.body;

  if (!allowedOrderStatuses.includes(status)) {
    return res.status(400).json({
      success: false,
      message: "Invalid order status.",
    });
  }

  try {
    const updateOrder = db.transaction(() => {
      const order = db
        .prepare("SELECT * FROM orders WHERE order_id = ?")
        .get(req.params.orderId);

      if (!order) {
        return { error: "NOT_FOUND" };
      }

      if (
        order.order_status === "Cancelled" ||
        order.order_status === "Delivered"
      ) {
        return { error: "FINAL_STATUS" };
      }

      const currentIndex = allowedOrderStatuses.indexOf(
        order.order_status
      );
      const nextIndex = allowedOrderStatuses.indexOf(status);

      if (nextIndex !== currentIndex + 1) {
        return { error: "INVALID_TRANSITION" };
      }

      db.prepare(`
        UPDATE orders
        SET order_status = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE order_id = ?
      `).run(status, order.order_id);

      db.prepare(`
        INSERT INTO order_status_history (
          order_id, status, note
        )
        VALUES (?, ?, ?)
      `).run(
        order.order_id,
        status,
        `Order status updated to ${status}.`
      );

      return {
        orderId: order.order_id,
        status,
      };
    });

    const result = updateOrder();

    if (result.error === "NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: "Order not found.",
      });
    }

    if (result.error === "FINAL_STATUS") {
      return res.status(409).json({
        success: false,
        message: "This order has reached a final status.",
      });
    }

    if (result.error === "INVALID_TRANSITION") {
      return res.status(409).json({
        success: false,
        message: "This status transition is not allowed.",
      });
    }

    return res.json({
      success: true,
      message: "Order status updated successfully.",
      order: result,
    });
  } catch (error) {
    console.error("Order status update failed:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to update order status.",
    });
  }
});

/* CANCEL ORDER
   Development only: add authenticated customer ownership
   checks before production.
*/
app.patch("/api/orders/:orderId/cancel", (req, res) => {
  const { reason } = req.body;
  const orderId = req.params.orderId;

  try {
    const cancelOrder = db.transaction(() => {
      const order = db
        .prepare("SELECT * FROM orders WHERE order_id = ?")
        .get(orderId);

      if (!order) {
        return { error: "NOT_FOUND" };
      }

      if (order.order_status === "Cancelled") {
        return { error: "ALREADY_CANCELLED" };
      }

      if (
        order.order_status === "Shipped" ||
        order.order_status === "Out for Delivery" ||
        order.order_status === "Delivered"
      ) {
        return { error: "CANNOT_CANCEL" };
      }

      db.prepare(`
        UPDATE orders
        SET order_status = 'Cancelled',
            updated_at = CURRENT_TIMESTAMP
        WHERE order_id = ?
      `).run(orderId);

      db.prepare(`
        INSERT INTO order_status_history (order_id, status, note)
        VALUES (?, ?, ?)
      `).run(
        orderId,
        "Cancelled",
        reason
          ? `Order cancelled. Reason: ${reason}`
          : "Order cancelled by customer."
      );

      return { orderId, status: "Cancelled" };
    });

    const result = cancelOrder();

    if (result.error === "NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: "Order not found."
      });
    }

    if (result.error === "ALREADY_CANCELLED") {
      return res.status(409).json({
        success: false,
        message: "Order is already cancelled."
      });
    }

    if (result.error === "CANNOT_CANCEL") {
      return res.status(409).json({
        success: false,
        message: "This order can no longer be cancelled."
      });
    }

    return res.json({
      success: true,
      message: "Order cancelled successfully.",
      order: result
    });
  } catch (error) {
    console.error("Order cancellation failed:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to cancel order."
    });
  }
});


// START SERVER — keep this at the bottom
app.listen(PORT, () => {
  console.log(
    `ShopSmart-AI backend running at http://localhost:${PORT}`
  );
});
