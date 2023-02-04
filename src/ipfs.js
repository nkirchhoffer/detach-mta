import 'dotenv/config';

import { create } from 'ipfs-http-client';

const uploadAttachments = async (attachments) => {
    const ipfsNode = create({
        host: process.env.IPFS_HOST,
        port: process.env.IPFS_PORT,
        protocole: 'http'
    });

    const options = {
        onlyHash: false,
        pin: true,
        wrapWithDirectory: false,
        timeout: 10000
    };

    const items = [];

    for (let i = 0; i < attachments.length; i++) {
        const attachment = attachments[i];
        const result = await ipfsNode.add(attachment.content, options);
        const url = new URL(result.cid, process.env.IPFS_PREFIX);

        items.push({
            filename: attachment.filename,
            url: url.href
        });
    }

    return items;
}

export default uploadAttachments;

