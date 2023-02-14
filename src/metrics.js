import 'dotenv/config';
import monk from 'monk';
const db = monk(process.env.MONGODB_LOGIN);

const mails = db.get('mails');

export function storeMailInfo(document) {
    mails.insert(document);
}