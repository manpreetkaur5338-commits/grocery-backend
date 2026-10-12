import express from "express";
import Product from "../model/product.js";

const productrouter = express.Router();

productrouter.get("/", async (req, res) => {
  try {
    const products = await Product.find();
    res.status(200).json(products);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch products", error: error.message });
  }
});

export default productrouter;