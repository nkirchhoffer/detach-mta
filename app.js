const fs = import('fs');
const nodeIpfsApi = import('ipfs-api');

// Connexion à IPFS
const ipfs = nodeIpfsApi('localhost', '5001');
const header = {
  getAddresses: () => ['toto.mail']
}
let body = "Hello see my attachment"
const attachments = [{
  filename : 'bim.txt',
  path:'mock'
}]
let ipfsLinks = addAttachmentsToIPFS(attachments);
modifyEmailBody(header, body, ipfsLinks);

/**
 * Fonction pour encrypter les pièces jointes avec AES-256-CTR
 * la clé et le IV doivent être communiqués au destinataire de manière sécurisée pour qu'il puisse déchiffrer la pièce-jointe.
 * @param {*} object 
 * @param {*} iv  vecteur d'initialisation (IV) aléatoire
 * @param {*} key une clé aléatoire pour le chiffrement
 * @returns 
 */
function encryptAttachment(object, iv, key) {
  // Instanciez un object de code secret
  const cipher = crypto.createCipheriv('aes-256-ctr', key, iv);

  // Crypter l'objet
  let encryptedObj = cipher.update(object);
  encryptedObj = Buffer.concat([encryptedObj, cipher.final()]);

  // Return the IV, key, and encrypted object as a single buffer
  return Buffer.concat([iv, key, encryptedObj]);
}

/**
 * Fonction pour ajouter des fichiers à IPFS
 * @param {*} attachments 
 * @returns 
 */
function addAttachmentsToIPFS(attachments) {
  // Créez un tableau pour stocker les liens IPFS des pièces jointes téléchargées
  let ipfsLinks = [];

  if (ipfsLinks.length > 0) {
    // Génèrez un vecteur d'initialisation (IV) aléatoire
    const iv = crypto.randomBytes(16);
    // Génèrez une clé aléatoire pour le chiffrement
    const key = crypto.randomBytes(32);

    // Parcourez toutes les pièces jointes du message électronique
    attachments.forEach(async (attachment) => {

      // Vérifiez si la pièce jointe est un fichier
      if (attachment.filename) {
        // Récupérez la taille du fichier
        const fileSize = await fs.promises.stat(attachment.path).size;

        // Lisez le fichier en mémoire
        const fileBuffer = await fs.promises.readFile(attachment.path);

        // Encryptez le fichier
        const encryptedFile = encryptAttachment(fileBuffer, iv, key);

        // Téléchargez le fichier sur IPFS
        const ipfsResponse = await ipfs.add(encryptedFile);

        // Récupérez le lien IPFS du fichier téléchargé
        const ipfsLink = `https://ipfs.io/ipfs/${ipfsResponse[0].hash}`;

        // Ajoutez le lien IPFS et la taille du fichier au tableau
        ipfsLinks.push({ link: ipfsLink, size: fileSize, encryptVector: iv, encryptKey: key });
      }
    });
  }

  return ipfsLinks;
}

/**
 * Fonction pour modifier le corps de l'email pour inclure 
 * le hash IPFS 
 * et l'espace de stockage éconmisé
 * @param {*} header 
 * @param {*} body 
 * @param {*} ipfsLinks 
 */
function modifyEmailBody(header, body, ipfsLinks) {
  // Calculez la taille totale des pièces jointes
  const totalSize = ipfsLinks.reduce((acc, link) => acc + link.size, 0);

  // Récupérez le nombre de destinataires
  const recipients = header.getAddresses('to').length + header.getAddresses('cc').length + header.getAddresses('bcc').length;

  // Ajoutez les liens IPFS
  body.push(`\n\nPièces jointes téléchargées sur IPFS:\n`);
  ipfsLinks.forEach((link) => {
    const fileDetails = `
    - ${link.link}
      Taille: ${link.size} bytes
      Clé: ${link.encryptKey.toString('hex')}
      IV: ${link.encryptVector.toString('hex')}
    `;
    body.push(`${fileDetails}`);
  });

  // Ajoutez la taille totale des pièces jointes au corps du message électronique
  body.push(`\nTaille totale des pièces jointes: ${totalSize} bytes`);
  body.push(`\nEspace de stockage économisé: ${totalSize * (recipients - 1)} bytes`);

  // Ajoutez des instructions d'accès
  const decryptionInstructions = `
    \n\nPour déchiffrer les pièces-jointes, veuillez suivre ces étapes :
    1. Téléchargez les pièces-jointes à partir des liens ci-dessous
    2. Utilisez la clé (Clé) et le vecteur d'initialisation (IV) suivants pour déchiffrer les pièces-jointes avec l'algorithme AES-256-CTR
    Clé : ${ipfsLinks[0].encryptKey.toString('hex')}
    IV : ${ipfsLinks[0].encryptVector.toString('hex')}
    `;

    body.push(`${decryptionInstructions}`);
}