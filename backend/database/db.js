
const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");

const databasePath = path.join(__dirname, "shopsmart.db");

const db = new Database(databasePath);

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id TEXT NOT NULL UNIQUE,
    customer_id TEXT NOT NULL,
    product_id INTEGER,
    product_name TEXT NOT NULL,
    product_image TEXT,
    quantity INTEGER NOT NULL DEFAULT 1,
    total_amount REAL NOT NULL DEFAULT 0,
    payment_method TEXT NOT NULL DEFAULT 'COD',
    order_status TEXT NOT NULL DEFAULT 'Order Confirmed'
      CHECK (order_status IN (
        'Order Confirmed',
        'Packed',
        'Shipped',
        'Out for Delivery',
        'Delivered',
        'Cancelled'
      )),
    estimated_delivery TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS order_status_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id TEXT NOT NULL,
    status TEXT NOT NULL,
    note TEXT,
    changed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(order_id)
      ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS return_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    return_id TEXT NOT NULL UNIQUE,
    order_id TEXT NOT NULL,
    customer_id TEXT NOT NULL,
    reason TEXT NOT NULL CHECK (reason IN (
      'Damaged Product',
      'Wrong Item',
      'Defective Product',
      'Product Not as Described',
      'Size/Fit Issue',
      'Other'
    )),
    description TEXT,
    quantity INTEGER NOT NULL DEFAULT 1,
    return_status TEXT NOT NULL DEFAULT 'Requested'
      CHECK (return_status IN (
        'Requested',
        'Approved',
        'Rejected',
        'Pickup Scheduled',
        'Picked Up',
        'Inspection',
        'Refund Processing',
        'Completed'
      )),
    admin_reason TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(order_id)
  );

  CREATE TABLE IF NOT EXISTS refunds (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    refund_id TEXT NOT NULL UNIQUE,
    order_id TEXT NOT NULL,
    return_id TEXT,
    amount REAL NOT NULL DEFAULT 0,
    refund_status TEXT NOT NULL DEFAULT 'Pending'
      CHECK (refund_status IN (
        'Not Applicable',
        'Pending',
        'Processing',
        'Completed',
        'Failed'
      )),
    provider_reference TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(order_id),
    FOREIGN KEY (return_id) REFERENCES return_requests(return_id)
  );

  CREATE INDEX IF NOT EXISTS idx_orders_customer
    ON orders(customer_id);

  CREATE INDEX IF NOT EXISTS idx_order_history
    ON order_status_history(order_id);

  CREATE INDEX IF NOT EXISTS idx_returns_customer
    ON return_requests(customer_id);
`);
db.exec(`
  CREATE TABLE IF NOT EXISTS customers (
    customer_id TEXT PRIMARY KEY,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL COLLATE NOCASE UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'customer'
      CHECK (role IN ('customer', 'admin')),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
`);

console.log("ShopSmart-AI database initialized.");

module.exports = db;
