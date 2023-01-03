const fs = require('fs');
const nodeIpfsApi = require('ipfs-api');
const milter = require('milter');

// Créez une nouvelle instance de milter
const mf = milter.create();

// Connexion à IPFS
const ipfs = nodeIpfsApi('localhost', '5001');

// Fonction de callback qui sera appelée lorsque le milter reçoit un nouveau message électronique
mf.on('message', (ctx, data) => {
  // Créez un tableau pour stocker les liens IPFS des pièces jointes téléchargées
  let ipfsLinks = [];

  // Parcourez toutes les pièces jointes du message électronique
  ctx.parts.forEach(async (part) => {
    // Vérifiez si la pièce jointe est un fichier
    if (part.filename) {
      // Récupérez la taille du fichier
      const fileSize = await fs.promises.stat(part.path).size;

      // Lisez le fichier en mémoire
      const fileBuffer = await fs.promises.readFile(part.path);

      // Téléchargez le fichier sur IPFS
      const ipfsResponse = await ipfs.add(fileBuffer);

      // Récupérez le lien IPFS du fichier téléchargé
      const ipfsLink = `https://ipfs.io/ipfs/${ipfsResponse[0].hash}`;

      // Ajoutez le lien IPFS et la taille du fichier au tableau
      ipfsLinks.push({ link: ipfsLink, size: fileSize });
    }
  });

  // Modifiez le corps du message électronique pour y ajouter les liens IPFS, la taille totale des pièces jointes et le nombre de destinataires
  ctx.modify((header, body) => {
    // Calculez la taille totale des pièces jointes
    const totalSize = ipfsLinks.reduce((acc, link) => acc + link.size, 0);

    // Récupérez le nombre de destinataires
    const recipients = header.getAddresses('to').length + header.getAddresses('cc').length + header.getAddresses('bcc').length;

    // Ajoutez les liens IPFS et la taille totale des pièces jointes au corps du message électronique
    body.push(`\n\nPièces jointes téléchargées sur IPFS:\n`);
    ipfsLinks.forEach((link) => {
      body.push(`${link.link} (${link.size} bytes)\n`);
    });
    body.push(`\nTaille totale des pièces jointes: ${totalSize} bytes`);
    body.push(`\nEspace de stockage économisé: ${totalSize*(recipients-1)} bytes`);

    return;
  });
});

// Démarrez le milter
mf.listen();