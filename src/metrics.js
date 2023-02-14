import 'dotenv/config';
import mongoose from 'mongoose';

import Mail from './model.js';

export async function storeMailInfo(doc) {

    try {
        await mongoose.connect(process.env.MONGODB_URL, {
            authSource: "admin",
            user: process.env.MONGODB_USER,
            pass: process.env.MONGODB_PASS
        });

        const mail = new Mail(doc);
        await mail.save();
    } catch (e) {
        console.error(e);
    }
}