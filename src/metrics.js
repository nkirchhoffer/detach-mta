import 'dotenv/config';
import mongoose from 'mongoose';

export async function storeMailInfo(doc) {

    try {
        await mongoose.connect(process.env.MONGODB_URL);

        const mailSchema = new mongoose.Schema({
            inboundSize: Number,
            outboundSize: Number,
            recipientsCount: Number,
            sender: String,
            hasAttachments: Boolean
        });

        const Mail = mongoose.model('Mail', mailSchema);

        const mail = new Mail(doc);
        await mail.save();
    } catch (e) {
        console.error(e);
    }
}