# RunCorse — Technical Design Doc

Auteur : Melissa Hassani · Date : 12 octobre 2026 · URL de production : (à remplir) · Dépôt : (à remplir) · Statut : final

## 1. TL;DR
RunCorse est un carnet d'entraînement sportif installable et fonctionnel hors ligne. Il cible les coureurs souhaitant consigner leurs sorties sans dépendre d'une connexion internet. Le choix technique principal est une architecture Vanilla JS avec IndexedDB pour garantir légèreté et contrôle total sur la synchronisation.

## 2. Contexte et objectifs
- L'application répond au besoin de tracer ses entraînements en extérieur, où le réseau cellulaire est souvent instable (montagne, sentiers).
- **Goals** : Ajouter des courses, fonctionner 100% hors ligne, synchroniser en arrière-plan, capturer la position GPS, et prendre des photos.
- **Non-goals** : Analyse poussée des performances, chronomètre en temps réel, ou authentification complexe.

## 3. Architecture
- **Stack** : Vanilla JS, HTML/CSS, Service Worker manuel et librairie `idb`. Cette stack évite la surcharge d'un framework pour un besoin simple et met en avant la maîtrise des API web natives.
- **Schéma** : Page HTML ↔ app.js (logique et IndexedDB) ↔ sw.js (proxy réseau et cache) ↔ Serveur.

## 4. Cache et hors ligne

| Ressource | Stratégie | Stockage | Pourquoi |
|---|---|---|---|
| HTML (shell) | Stale While Revalidate | Cache API | Affichage immédiat tout en récupérant la version à jour en arrière-plan. |
| CSS, JS, images | Cache First | Cache API | Ressources statiques versionnées, inutiles à re-télécharger. |
| Données (Outbox) | Network First (repli local) | IndexedDB | Les données dynamiques nécessitent le réseau, avec un repli local transparent. |

- Hors ligne, l'utilisateur voit une bannière d'avertissement. S'il tente de naviguer vers une URL non cachée, `offline.html` prend le relais.

## 5. Mise à jour
- **Stratégie retenue** : Proposée à l'utilisateur (bannière "Nouvelle version").
- **Mécanisme** : Le nouveau Service Worker est détecté (`updatefound`) et mis en attente. Une bannière s'affiche dans l'UI. Au clic, on lui envoie un message `SKIP_WAITING` pour forcer l'activation (`self.skipWaiting()`). La page se recharge alors automatiquement (`controllerchange`). Cela évite de casser la session en cours de l'utilisateur par une mise à jour silencieuse.

## 6. Données et synchronisation
- **Modèle de données** : Base `run-corse-db` avec deux stores : `runs` (affichage local) et `outbox` (attente de synchronisation).
- **Outbox** : Les ajouts sont placés dans l'outbox. La synchronisation est confiée au Background Sync (`sync-outbox`). En cas d'échec ou de non-support (Safari/Firefox), un fallback sur l'événement `window.online` vide la file d'attente.

## 7. Permissions et capacités de l'appareil

| Capacité / API | Déclenchée quand | Pourquoi à ce moment | Si refus |
|---|---|---|---|
| Géolocalisation | Au clic sur "Mémoriser ma position" | L'utilisateur doit initier et comprendre l'action de localisation. | Un message "Position refusée ou introuvable" s'affiche proprement dans l'interface. |
| Caméra | Au clic sur "Afficher la caméra" | Permet à l'utilisateur de photographier son parcours. Capture l'image via un `<canvas>`. | Un message "Accès refusé" s'affiche sans bloquer l'application. |

## 8. Notifications
- Aucune. Non pertinent pour le cas d'usage actuel.

## 9. Visibilité : SEO et agents IA
- Le HTML initial contient trois exemples d'entraînements (`data-seed`) lus par les robots, ensuite importés dans IndexedDB au premier lancement.
- Fichiers présents : `robots.txt`, `sitemap.xml`, `llms.txt`, balises Open Graph et JSON-LD (`WebApplication`).

## 10. Sécurité et vie privée
- Aucune donnée sensible n'est envoyée sans validation. Les données restent dans IndexedDB. `textContent` est utilisé pour l'affichage, bloquant les failles XSS.