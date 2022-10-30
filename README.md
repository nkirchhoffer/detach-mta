# État actuel du projet

- Serveur mail fonctionnel (SMTP/IMAP) sur un serveur hébergé par OVH
    - SMTP: mail.clebard.cloud, port 983, STARTTLS
    - IMAP : mail.clebard.cloud, port 143, SSL/TLS
    - webmail: https://webmail.clebard.cloud
- Postfix envoie les mails au [proxy before_queue](http://www.postfix.org/SMTPD_PROXY_README.html) “fait maison” qui récupère le contenu du mail via un stream, le parse, récupère les attachments (= pièces-jointes) et renvoie le mail sans celles-ci

# Approches

1. **Utiliser le paramètre `relayhost` pour envoyer les mails entrants à un serveur qu’on écrit nous-mêmes**
    
    Principe : Récupérer les mails qui entrent sur Postfix, les traiter puis les envoyer nous-mêmes
    
    Inconvénient : Configuration redondante (et lourde) sur 2 serveurs mail différents (postfix et le MTA maison)
    
    Avantages : Service léger et scalable horizontalement (avec Load Balancer)
    
    → Si on envoie tous les mails entrants au MTA “maison”, alors ceux envoyés par le MTA à Postfix en retour sont à nouveau envoyés au MTA *(mail loop)*
    
    **Solution abandonnée au profit du 2.**
    
    ```mermaid
    graph LR
      Postfix(Postfix) --1. SMTP--> MTA(MTA Filtre)
    	MTA(MTA Filtre) --2. SMTP--> MTA2(MTA Rcpt)
    	MTA2(MTA Rcpt) --3. LMTP--> MDA(MDA)
    ```
    
2. **Utiliser le protocole/API Milter défini par Postfix et Sendmail**
    
    Principe : Postfix avertit un service externe (par l’API Milter) en direct de l’activité des mails entrants
    
    Inconvénient : difficile d’utilisation, peu d’exemples/implems réels, documentation floue
    
    Avantage : solution conçue pour manipuler la donnée du mail et la renvoyer à Postfix
    
    → Implémentation difficile et pas de librairies sur NodeJS
    
    **Solution abandonnée au profit du 3.**
    
    ```mermaid
    graph LR
      Postfix(Postfix) --1. Milter--> Milter(Milter)
    	Milter(Filtre) --2. Milter-->Postfix(Postfix)
    	Postfix(Postfix) --3. SMTP--> MTA(MTA)
    ```
    
3.  **Utiliser le principe de `[before-queue content filter](http://www.postfix.org/SMTPD_PROXY_README.html)` (proxy) pour récupérer les mails avant leur mise en file d’attente par Postfix**
    
    Principe : Postfix envoie le mail entrant à l’agent filtre (également un serveur SMTP, via ESMTP, développé “maison”) pour traitement, lequel dispose de 100 secondes pour le réinjecter à Postfix via ESMTP
    
    Avantage : mêmes avantages que le 1. en terme d’architecture (pas de couplage strict bien que dépendance), scalable…
    
    Inconvénient : pas d’implem des technologies requises pour réinjecter les mails à Postfix dans les librairies clientes NodeJS (`XFORWARD`) 
    
    → Nécessite un fork d’un client SMTP pour compléter le fonctionnement
    
    **Solution toujours envisagée car les clients SMTP existants sont déjà bas-niveau (lié à la complexité du protocole), pas beaucoup de perte de temps à réimplémenter (partiellement) les RFC**
    
    ```mermaid
    graph LR
      Postfix(Postfix) --1. SMTP--> MTA(Filtre)
    	MTA(Filtre) --2. SMTP-->Postfix(Postfix)
    	Postfix(Postfix) --3. SMTP-->MTA2[MTA]
    ```
    

# Progression

- 27/10 : début de l’implémentation du `before-queue filter`
- 30/10 : débugage + refactor code + traitement des PJ

# Dépôt GitHub

- [https://github.com/nkirchhoffer/detach-mta](https://github.com/nkirchhoffer/detach-mta)