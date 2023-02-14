import 'dotenv/config';
import monk from 'monk';
import { v4 as uuid } from 'uuid';
const db = monk(process.env.MONGODB_LOGIN);


export function storeMailInfo(doc) {
    const mails = db.get('mails');
    const id = monk.id();
    console.log(mails);
    mails.insert({
        _id: id,
        ...document
    });
}