import mongoose from "mongoose";
const subSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true
    },
    name: {
        type: String,
        required: true,
    },

}, {
    timestamps: true
})

const Subscriber = mongoose.model("Subscriber", subSchema)
export default Subscriber