# Ligue de Judo Blida — Guide de déploiement

Application de gestion de la Ligue de Judo de Blida (saison 2026/2027) :
clubs affiliés, licences par catégorie, règlements, statistiques, archives par saison.

Code d'accès par défaut : **omar1208**

## Étape 1 — Créer une base de données gratuite (MongoDB Atlas)
1. Aller sur https://www.mongodb.com/cloud/atlas/register et créer un compte gratuit.
2. Créer un cluster gratuit (M0).
3. Dans **Database Access**, créer un utilisateur (nom + mot de passe).
4. Dans **Network Access**, ajouter `0.0.0.0/0` (autoriser depuis partout).
5. Cliquer sur **Connect** → **Drivers** → copier l'URI de connexion, qui ressemble à :
   `mongodb+srv://utilisateur:motdepasse@cluster0.xxxxx.mongodb.net/ligueJudoBlida`
   (remplacer `motdepasse` par le vrai mot de passe, et garder `/ligueJudoBlida` à la fin comme nom de base).

## Étape 2 — Mettre le code sur GitHub
1. Créer un compte sur https://github.com si nécessaire.
2. Créer un nouveau dépôt (repository), par exemple `ligue-judo-blida`.
3. Depuis ce dossier, exécuter :
   ```
   git init
   git add .
   git commit -m "Première version"
   git branch -M main
   git remote add origin https://github.com/VOTRE_COMPTE/ligue-judo-blida.git
   git push -u origin main
   ```

## Étape 3 — Héberger gratuitement sur Render
1. Aller sur https://render.com et créer un compte (connecté à GitHub).
2. Cliquer sur **New +** → **Web Service**.
3. Choisir le dépôt `ligue-judo-blida`.
4. Renseigner :
   - **Build Command** : `npm install`
   - **Start Command** : `npm start`
5. Dans **Environment Variables**, ajouter :
   - `MONGODB_URI` = l'URI copiée à l'étape 1
   - `ADMIN_PASSWORD` = `omar1208` (ou un autre code si vous voulez le changer)
   - `SESSION_SECRET` = une phrase secrète quelconque
6. Cliquer sur **Create Web Service**. Après quelques minutes, une adresse du type
   `https://ligue-judo-blida.onrender.com` sera disponible.

## Étape 4 — Installer sur téléphone / ordinateur
- **Téléphone (Android/iPhone)** : ouvrir l'adresse dans le navigateur (Chrome/Safari) →
  menu du navigateur → **Ajouter à l'écran d'accueil**. L'application apparaîtra comme
  une icône normale.
- **Ordinateur** : ouvrir l'adresse dans Chrome → icône d'installation dans la barre
  d'adresse → **Installer**.

## Mise à jour de l'application plus tard
Si des modifications sont apportées aux fichiers :
```
git add .
git commit -m "Mise à jour"
git push
```
Render redéploie automatiquement la nouvelle version.

## Notes importantes
- Les données (clubs, paiements, tarifs, archives) sont stockées dans MongoDB Atlas :
  elles restent disponibles même si vous changez de téléphone.
- Le bouton **"Nouvelle saison"** (dans Tableau de bord) archive automatiquement toute
  la saison en cours et repart avec une liste de clubs vide — l'historique reste
  consultable dans l'onglet **Archives**.
- Les tarifs des licences (par catégorie) se règlent dans l'onglet **Réglages**, et
  peuvent être modifiés à tout moment dès qu'ils sont connus.
