import mongoose from 'mongoose';

const mailSchema = new mongoose.Schema({
    date: String,
    inboundSize: Number,
    outboundSize: Number,
    recipientsCount: Number,
    sender: String,
    hasAttachments: Boolean
});

export default mongoose.model('Mail', mailSchema);