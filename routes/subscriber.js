import express from "express";
import Subscriber from "../model/subscriber.js";

const subscriberrouter = express.Router();

subscriberrouter.post("/", async (req, res) => {
    try {
        const { email, name } = req.body
        const newSubscriber = new Subscriber({
            email,
            name
        })
        await newSubscriber.save()
        res.status(201).json({ message: "Subscriber added successfully" })
    } catch (error) {
        res.status(500).json({ message: "Error adding subscriber", error })
    }
})
export default subscriberrouter