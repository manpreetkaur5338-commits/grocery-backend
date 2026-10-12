import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import subscriberrouter from "./routes/subscriber.js";
import productrouter from "./routes/productroutes.js";
import userrouter from "./routes/userroutes.js";
import orderrouter from "./routes/orderroutes.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Routes
app.use("/api/products", productrouter);
app.use("/api/auth", userrouter);
app.use("/api/users", userrouter);
app.use("/api/orders", orderrouter);
app.use("/api/subscriber", subscriberrouter);
mongoose.connect(process.env.MONGOURI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.log("MongoDB connection error:", err));

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

