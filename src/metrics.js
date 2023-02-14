import 'dotenv/config';
import monk from 'monk';
import { v4 as uuid } from 'uuid';
const db = monk(process.env.MONGODB_LOGIN);


export async function storeMailInfo(doc) {
    const mails = db.get('mails');
    const id = monk.id();
    
    try {
        console.log(mails);
        await mails.insert({
            _id: id,
            ...doc
        });
    } catch (e) {
        console.error(e);
    }

    db.close();
}