import mongoose from "mongoose";

const orderItemSchema = new mongoose.Schema({
  productId: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  unit: {
    type: String,
    default: "item"
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
    default: 1
  },
  image: {
    type: String,
    default: ""
  },
  category: {
    type: String,
    default: "Groceries"
  }
});

const statusHistorySchema = new mongoose.Schema({
  status: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  note: {
    type: String,
    default: ""
  }
});

const orderSchema = new mongoose.Schema(
  {
    orderId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    userId: {
      type: String,
      default: null
    },
    userEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true
    },
    userName: {
      type: String,
      default: "Valued Customer"
    },
    customerDetails: {
      fullName: { type: String, required: true, trim: true },
      email: { type: String, required: true, lowercase: true, trim: true },
      phone: { type: String, required: true, trim: true },
      street: { type: String, required: true, trim: true },
      city: { type: String, required: true, trim: true },
      state: { type: String, required: true, trim: true },
      pincode: { type: String, required: true, trim: true },
      deliveryNotes: { type: String, default: "" }
    },
    items: [orderItemSchema],
    subtotal: {
      type: Number,
      required: true
    },
    shippingFee: {
      type: Number,
      default: 0
    },
    discount: {
      type: Number,
      default: 0
    },
    totalAmount: {
      type: Number,
      required: true
    },
    paymentMethod: {
      type: String,
      enum: ["COD", "UPI", "Card", "NetBanking"],
      required: true
    },
    paymentStatus: {
      type: String,
      enum: ["Pending", "Paid", "Failed", "Refunded"],
      default: "Pending"
    },
    paymentDetails: {
      transactionId: { type: String, default: "" },
      gatewayStatus: { type: String, default: "" },
      paidAt: { type: Date, default: null },
      cardLast4: { type: String, default: "" },
      bankName: { type: String, default: "" },
      upiId: { type: String, default: "" }
    },
    orderStatus: {
      type: String,
      enum: [
        "Order Placed",
        "Confirmed",
        "Processing",
        "Out for Delivery",
        "Delivered",
        "Cancelled"
      ],
      default: "Order Placed"
    },
    statusHistory: [statusHistorySchema],
    estimatedDelivery: {
      type: String,
      default: "Within 30-45 minutes"
    }
  },
  {
    timestamps: true
  }
);

const Order = mongoose.model("Order", orderSchema);
export default Order;
