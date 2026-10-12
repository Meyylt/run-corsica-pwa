# 🏃 RunCorse — Progressive Web App

**RunCorse** est un carnet d'entraînement sportif conçu sous forme de Progressive Web App (PWA). Développé dans le cadre du cours de M2 DFS à l'Università di Corsica, il permet de consigner ses sorties sportives sur le terrain, même sans réseau.

## ✨ Fonctionnalités principales

- **Installable** : S'ajoute à l'écran d'accueil du téléphone comme une application native (Manifest complet).
- **100% Hors ligne** : Fonctionne sans connexion réseau grâce au Service Worker et au stockage local (IndexedDB).
- **Synchronisation différée** : Les entraînements saisis hors ligne sont stockés dans une "Outbox" et envoyés automatiquement au serveur dès le retour du réseau (Background Sync / Fallback).
- **Visibilité IA et Moteurs de recherche** : Contenu public intégré au HTML initial, fichiers de découverte (`robots.txt`, `llms.txt`, `sitemap.xml`) et balises Open Graph.
- **Capacités natives** : 
  - 📍 **Géolocalisation** : Capture des coordonnées GPS de départ.
  - 📸 **Caméra** : Prise de photo du parcours directement via l'application.

## 🚀 Lancer le projet en local

Pour tester l'application sur votre machine, vous devez utiliser un serveur HTTP local (le Service Worker exige un contexte sécurisé ou `localhost`).

### Méthode 1 : Avec Python (Recommandé si vous n'avez pas Node.js)
Ouvrez un terminal dans le dossier du projet et lancez :
```bash
python3 -m http.server 3000
```
*(L'application sera accessible sur `http://localhost:3000`)*

### Méthode 2 : Avec Node.js (`npx serve`)
Ouvrez un terminal dans le dossier du projet et lancez :
```bash
npx serve
```

## 📄 Documentation technique

Tous les choix architecturaux et les stratégies de cache sont détaillés et justifiés dans le document technique du projet :
👉 **[Lire le Document Technique (DOC-TECHNIQUE.md)](DOC-TECHNIQUE.md)**

---
*Projet réalisé par Melissa Hassani.*