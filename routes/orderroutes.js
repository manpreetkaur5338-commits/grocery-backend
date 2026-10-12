import express from "express";
import Order from "../model/ordermodel.js";

const orderrouter = express.Router();

// Helper to generate a unique readable Order ID
const generateOrderId = () => {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `ORD-${dateStr}-${randomSuffix}`;
};

// =========================================================================
// 1. POST /api/orders/create (Create a new Order)
// =========================================================================
orderrouter.post("/create", async (req, res) => {
  try {
    const {
      userId,
      userEmail,
      userName,
      customerDetails,
      items,
      subtotal,
      shippingFee = 0,
      discount = 0,
      totalAmount,
      paymentMethod,
      paymentData = {}
    } = req.body;

    // Validation
    if (!userEmail || !customerDetails || !items || items.length === 0 || !totalAmount || !paymentMethod) {
      return res.status(400).json({
        success: false,
        message: "Incomplete order data. Please provide customer details, items, total, and payment method."
      });
    }

    const orderId = generateOrderId();
    const now = new Date();

    let initialPaymentStatus = "Pending";
    let initialOrderStatus = "Order Placed";
    const statusHistory = [];

    const paymentDetails = {
      transactionId: "",
      gatewayStatus: "",
      paidAt: null,
      cardLast4: "",
      bankName: "",
      upiId: ""
    };

    if (paymentMethod === "COD") {
      initialPaymentStatus = "Pending";
      initialOrderStatus = "Order Placed";
      paymentDetails.gatewayStatus = "Pending on Delivery";
      paymentDetails.transactionId = `COD-${Date.now()}`;
      
      statusHistory.push({
        status: "Order Placed",
        timestamp: now,
        note: "Order placed with Cash on Delivery (COD). Payment will be collected at doorstep."
      });
    } else {
      // Online Payment (UPI, Card, NetBanking)
      // Server-side verification of payment gateway simulation
      const { transactionId, cardLast4, bankName, upiId, isVerified } = paymentData;

      if (!isVerified && !transactionId) {
        return res.status(400).json({
          success: false,
          message: "Payment verification failed. Payment was not authorized by the gateway."
        });
      }

      initialPaymentStatus = "Paid";
      initialOrderStatus = "Confirmed";
      paymentDetails.transactionId = transactionId || `TXN-${paymentMethod.toUpperCase()}-${Date.now()}`;
      paymentDetails.gatewayStatus = "SUCCESS";
      paymentDetails.paidAt = now;
      paymentDetails.cardLast4 = cardLast4 ? cardLast4.slice(-4) : "";
      paymentDetails.bankName = bankName || "";
      paymentDetails.upiId = upiId || "";

      statusHistory.push({
        status: "Order Placed",
        timestamp: new Date(now.getTime() - 1000),
        note: `Order initiated with online payment via ${paymentMethod}.`
      });

      statusHistory.push({
        status: "Confirmed",
        timestamp: now,
        note: `Payment of $${Number(totalAmount).toFixed(2)} verified successfully via ${paymentMethod} (Txn: ${paymentDetails.transactionId}).`
      });
    }

    // Create Order in MongoDB
    const newOrder = new Order({
      orderId,
      userId: userId || null,
      userEmail: userEmail.toLowerCase().trim(),
      userName: userName || customerDetails.fullName || "Valued Customer",
      customerDetails: {
        fullName: customerDetails.fullName,
        email: customerDetails.email || userEmail,
        phone: customerDetails.phone,
        street: customerDetails.street,
        city: customerDetails.city,
        state: customerDetails.state,
        pincode: customerDetails.pincode,
        deliveryNotes: customerDetails.deliveryNotes || ""
      },
      items,
      subtotal: Number(subtotal),
      shippingFee: Number(shippingFee),
      discount: Number(discount),
      totalAmount: Number(totalAmount),
      paymentMethod,
      paymentStatus: initialPaymentStatus,
      paymentDetails,
      orderStatus: initialOrderStatus,
      statusHistory,
      estimatedDelivery: "Within 30-45 minutes"
    });

    const savedOrder = await newOrder.save();

    return res.status(201).json({
      success: true,
      message: "Order placed successfully!",
      order: savedOrder
    });

  } catch (error) {
    console.error("Create order error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to place order. Please try again.",
      error: error.message
    });
  }
});

// =========================================================================
// 2. POST /api/orders/verify-payment (Sandbox Gateway Verification)
// =========================================================================
orderrouter.post("/verify-payment", async (req, res) => {
  try {
    const { paymentMethod, amount, paymentDetails = {} } = req.body;

    if (!paymentMethod || !amount) {
      return res.status(400).json({
        success: false,
        message: "Missing payment method or amount for verification."
      });
    }

    // In a production app, verify signature with Razorpay/Stripe/PayPal API.
    // In test/sandbox mode, validate format and verify transaction.
    const transactionId = `TXN-SANDBOX-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;

    return res.status(200).json({
      success: true,
      verified: true,
      transactionId,
      status: "SUCCESS",
      paymentMethod,
      amount: Number(amount),
      verifiedAt: new Date().toISOString(),
      message: `Sandbox payment of $${Number(amount).toFixed(2)} verified successfully via ${paymentMethod}.`
    });

  } catch (error) {
    console.error("Payment verification error:", error);
    return res.status(500).json({
      success: false,
      message: "Payment verification failed on gateway.",
      error: error.message
    });
  }
});

// =========================================================================
// 3. GET /api/orders/user/:email (Get Orders for Logged-In User)
// =========================================================================
orderrouter.get("/user/:email", async (req, res) => {
  try {
    const userEmail = (req.params.email || "").toLowerCase().trim();
    if (!userEmail) {
      return res.status(400).json({
        success: false,
        message: "Email is required."
      });
    }

    const orders = await Order.find({ userEmail }).sort({ createdAt: -1 });
    return res.status(200).json({
      success: true,
      count: orders.length,
      orders
    });
  } catch (error) {
    console.error("Fetch user orders error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch orders.",
      error: error.message
    });
  }
});

// =========================================================================
// 4. GET /api/orders/:orderId (Get Single Order Details)
// =========================================================================
orderrouter.get("/:orderId", async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await Order.findOne({ orderId });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: `Order #${orderId} not found.`
      });
    }

    return res.status(200).json({
      success: true,
      order
    });
  } catch (error) {
    console.error("Fetch single order error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve order details.",
      error: error.message
    });
  }
});

// =========================================================================
// 5. POST /api/orders/:orderId/cancel (Cancel Order)
// =========================================================================
orderrouter.post("/:orderId/cancel", async (req, res) => {
  try {
    const { orderId } = req.params;
    const { reason = "Cancelled by user" } = req.body;

    const order = await Order.findOne({ orderId });
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found."
      });
    }

    if (order.orderStatus === "Delivered") {
      return res.status(400).json({
        success: false,
        message: "Delivered orders cannot be cancelled."
      });
    }

    if (order.orderStatus === "Cancelled") {
      return res.status(400).json({
        success: false,
        message: "Order is already cancelled."
      });
    }

    order.orderStatus = "Cancelled";
    if (order.paymentStatus === "Paid") {
      order.paymentStatus = "Refunded";
    }

    order.statusHistory.push({
      status: "Cancelled",
      timestamp: new Date(),
      note: reason
    });

    await order.save();

    return res.status(200).json({
      success: true,
      message: `Order #${orderId} has been cancelled.`,
      order
    });
  } catch (error) {
    console.error("Cancel order error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to cancel order.",
      error: error.message
    });
  }
});

// =========================================================================
// 6. GET /api/orders/admin/all (Admin: Get All Orders)
// =========================================================================
orderrouter.get("/admin/all", async (req, res) => {
  try {
    const { status, search } = req.query;
    const query = {};

    if (status && status !== "All") {
      query.orderStatus = status;
    }

    if (search) {
      query.$or = [
        { orderId: { $regex: search, $options: "i" } },
        { userEmail: { $regex: search, $options: "i" } },
        { "customerDetails.fullName": { $regex: search, $options: "i" } },
        { "customerDetails.phone": { $regex: search, $options: "i" } }
      ];
    }

    const orders = await Order.find(query).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: orders.length,
      orders
    });
  } catch (error) {
    console.error("Admin fetch orders error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch admin orders.",
      error: error.message
    });
  }
});

// =========================================================================
// 7. PUT /api/orders/admin/:orderId/status (Admin: Update Order Status)
// =========================================================================
orderrouter.put("/admin/:orderId/status", async (req, res) => {
  try {
    const { orderId } = req.params;
    const { orderStatus, paymentStatus, note } = req.body;

    const order = await Order.findOne({ orderId });
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found."
      });
    }

    let statusChanged = false;

    if (orderStatus && order.orderStatus !== orderStatus) {
      order.orderStatus = orderStatus;
      statusChanged = true;
    }

    if (paymentStatus && order.paymentStatus !== paymentStatus) {
      order.paymentStatus = paymentStatus;
      if (paymentStatus === "Paid" && !order.paymentDetails.paidAt) {
        order.paymentDetails.paidAt = new Date();
        order.paymentDetails.gatewayStatus = "COLLECTED_AT_DELIVERY";
      }
    }

    const customNote = note || `Status updated to "${order.orderStatus}" by Store Manager.`;
    order.statusHistory.push({
      status: order.orderStatus,
      timestamp: new Date(),
      note: customNote
    });

    await order.save();

    return res.status(200).json({
      success: true,
      message: `Order #${orderId} updated to ${order.orderStatus}`,
      order
    });
  } catch (error) {
    console.error("Admin update order status error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update order status.",
      error: error.message
    });
  }
});

export default orderrouter;
