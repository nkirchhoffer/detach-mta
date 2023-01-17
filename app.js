import "dotenv/config";
import { randomBytes, createCipheriv } from "crypto";
import { promises } from "fs";
import { create } from "ipfs-http-client";

// Connexion à IPFS
const ipfsNode = create({ host: "127.0.0.1", port: "5001", protocol: "http" });
const addOptions = {
  onlyHash: false,
  pin: true,
  wrapWithDirectory: false,
  timeout: 10000,
};

//////TODO : REPLACE BY MAIN BRANCH////////
// Mail details
const header = {
  getAddresses: (_) => ["mock@mail.com"],
  //getAddresses: (arg) => arg == 'to' ? ["mock@mail.com"] : [],
};
let body = "Hello see my attachment";
const attachments = [
  {
    filename: "bim.txt",
    path: "mock",
  },
];
//////////////////////////////////////////

// Detach documents
try {
  let ipfsLinks = await addAttachmentsToIPFS(attachments);
  if (ipfsLinks.length > 0) body = modifyEmailBody(header, body, ipfsLinks);
  console.log(body);
  console.log("Done");
} catch (error) {
  console.error("Error raised while detaching attachments.");
}

/**
 * Fonction pour encrypter les pièces jointes avec AES-256-CTR
 * la clé et le IV doivent être communiqués au destinataire de manière sécurisée pour qu'il puisse déchiffrer la pièce-jointe.
 * @param {*} object
 * @param {string} iv  vecteur d'initialisation (IV) aléatoire
 * @param {string} key une clé aléatoire pour le chiffrement
 * @returns
 */
function encryptAttachment(object, iv, key) {
  // Instanciez un object de code secret
  const cipher = createCipheriv("aes-256-ctr", key, iv);

  // Crypter l'objet
  let encryptedObj = cipher.update(object);
  encryptedObj = Buffer.concat([encryptedObj, cipher.final()]);

  // Return the IV, key, and encrypted object as a single buffer
  return Buffer.concat([iv, key, encryptedObj]);
}

/**
 * Fonction pour ajouter des fichiers à IPFS
 * @param {{filename:string, path:string}[]} attachments
 * @returns {Promise<{filename:string, url:string, size:string, encryptVector: string, encryptKey: string }[]>}
 */
async function addAttachmentsToIPFS(attachments) {
  // Créez un tableau pour stocker les liens IPFS des pièces jointes téléchargées
  let ipfsLinks = [];

  if (attachments.length > 0) {
    // Génèrez un vecteur d'initialisation (IV) aléatoire
    const iv = randomBytes(16);
    // Génèrez une clé aléatoire pour le chiffrement
    const key = randomBytes(32);

    const allAsyncResultsP = [];
    // Parcourez toutes les pièces jointes du message électronique
    for (const attachment of attachments) {
      const asyncResultP = addAttachmentToIPFS(iv, key, attachment);
      // Ajoutez le lien IPFS et la taille du fichier au tableau
      allAsyncResultsP.push(asyncResultP);
    }

    // Résolvez les promesses du tableau
    ipfsLinks = await Promise.all(allAsyncResultsP);
  }
  return ipfsLinks;
}

/**
 * Fonction pour encrypter et ajouter un fichier à IPFS
 * @param {string} iv
 * @param {string} key
 * @param {{filename:string, path:string}} attachment
 * @returns {Promise<{filename:string, url:string, size:string, encryptVector: string, encryptKey: string }>}
 */
async function addAttachmentToIPFS(iv, key, attachment) {
  // Vérifiez si la pièce jointe est un fichier
  if (attachment.filename) {
    const filePath = attachment.path
      ? `${attachment.path}/${attachment.filename}`
      : attachment.filename;

    // Récupérez la taille du fichier
    const fileSize = (await promises.stat(filePath)).size;

    // Lisez le fichier en mémoire
    const fileBuffer = await promises.readFile(filePath);

    // Encryptez le fichier
    const encryptedFile = encryptAttachment(fileBuffer, iv, key);

    // Téléchargez le fichier sur IPFS
    const ipfsResponse = await ipfsNode.add(encryptedFile, addOptions);

    // Récupérez le lien IPFS du fichier téléchargé
    const ipfsURL = new URL(ipfsResponse.cid, process.env.IPFS_PREFIX);

    return {
      filename: attachment.filename,
      url: ipfsURL.toString(),
      size: fileSize,
      encryptVector: iv,
      encryptKey: key,
    };
  }
}

/**
 * Fonction pour modifier le corps de l'email pour inclure
 * le hash IPFS
 * et l'espace de stockage éconmisé
 * @param {{ getAddresses: () => string}} header
 * @param {string} body
 * @param {{filename:string, url:string, size:string, encryptVector: string, encryptKey: string }[]}  ipfsLinks
 */
function modifyEmailBody(header, body, ipfsLinks) {
  // Calculez la taille totale des pièces jointes
  const totalSize = ipfsLinks.reduce((acc, link) => acc + link.size, 0);

  // Récupérez le nombre de destinataires
  const recipients =
    header.getAddresses("to").length +
    header.getAddresses("cc").length +
    header.getAddresses("bcc").length;

  // Ajoutez les liens IPFS
  body = body.concat(`\n\nPièces jointes téléchargées sur IPFS:\n`);
  ipfsLinks.forEach((link) => {
    const fileDetails = `
    - ${link.filename}
      Lien: ${link.url}
      Taille: ${link.size} bytes
      `;
      // Clé: ${link.encryptKey.toString("hex")}
      // IV: ${link.encryptVector.toString("hex")}
    body = body.concat(`${fileDetails}`);
  });

  // Ajoutez la taille totale des pièces jointes au corps du message électronique
  body = body.concat(`\nTaille totale des pièces jointes: ${totalSize} bytes`);
  body = body.concat(
    `\nEspace de stockage économisé: ${totalSize * (recipients - 1)} bytes`
  );

  // Ajoutez des instructions d'accès
  const decryptionInstructions = `
    \n\nPour déchiffrer les pièces-jointes, veuillez suivre ces étapes :
    1. Téléchargez les pièces-jointes à partir des liens ci-dessus
    2. Utilisez la clé (K) et le vecteur d'initialisation (IV) suivants pour déchiffrer les pièces-jointes avec l'algorithme AES-256-CTR
    K : ${ipfsLinks[0].encryptKey.toString("hex")}
    IV : ${ipfsLinks[0].encryptVector.toString("hex")}
    `;

  body = body.concat(`${decryptionInstructions}`);
  return body;
}
