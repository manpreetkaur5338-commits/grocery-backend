import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    id: {
      type: Number,
      required: true,
      unique: true
    },

    name: {
      type: String,
      required: true,
      trim: true
    },

    category: {
      type: String,
      required: true,
      trim: true
    },

    price: {
      type: Number,
      required: true,
      min: 0
    },

    unit: {
      type: String,
      required: true
    },

    rating: {
      type: Number,
      required: true,
      min: 0,
      max: 5
    },

    reviewsCount: {
      type: Number,
      required: true,
      min: 0,
      default: 0
    },

    badge: {
      type: String,
      default: ""
    },

    image: {
      type: String,
      required: true
    },

    description: {
      type: String,
      required: true,
      trim: true
    }
  },
  {
    timestamps: true
  }
);

const Product = mongoose.model("Product", productSchema);

export default Product;