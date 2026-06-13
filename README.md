# 🧠 CultureBot APK

App Android hors ligne de culture générale — 200 anecdotes, notifications configurables, aucune connexion requise.

---

## ✨ Fonctionnalités

| Fonctionnalité | Détail |
|---|---|
| 📚 200+ anecdotes | Toutes catégories, vérifiées, intégrées dans l'app |
| 🔔 Notifications | Rappels automatiques configurables (15 min → 1 jour) |
| 📂 Catégories | Science, Histoire, Géo, Art, Tech, Nature |
| 🔥 Streak | Compteur de jours consécutifs |
| 📊 Statistiques | Progression, catégories, anecdotes vues |
| ↩ Carte retournable | Animations flip pour révéler la catégorie |
| 📤 Partage | Partage natif Android |
| 🔄 Anti-doublons | Les 30 dernières anecdotes ne sont pas répétées |
| 💾 100% hors ligne | Pas de clé API, pas de connexion internet |

---

## 🚀 Build de l'APK — Étape par étape

### Prérequis

| Outil | Version | Téléchargement |
|---|---|---|
| Node.js | ≥ 18 | [nodejs.org](https://nodejs.org) |
| Android Studio | Dernière | [developer.android.com/studio](https://developer.android.com/studio) |
| Java JDK | ≥ 17 | Inclus dans Android Studio |

> 💡 Android Studio installe automatiquement le SDK Android et Gradle.

---

### 1. Installer les dépendances

```bash
cd culturebot-apk
npm install
```

### 2. Builder le projet web

```bash
npm run build
# → Génère le dossier dist/
```

### 3. Initialiser Capacitor

```bash
npx cap init CultureBot com.culturebot.app --web-dir dist
```

### 4. Ajouter la plateforme Android

```bash
npx cap add android
```

### 5. Copier le manifest personnalisé

```bash
cp AndroidManifest.xml android/app/src/main/AndroidManifest.xml
```

### 6. Synchroniser

```bash
npx cap sync android
```

### 7. Ouvrir dans Android Studio

```bash
npx cap open android
```

Android Studio s'ouvre automatiquement avec le projet.

### 8. Générer l'APK

Dans Android Studio :
```
Menu → Build → Build Bundle(s) / APK(s) → Build APK(s)
```

L'APK se trouve dans :
```
android/app/build/outputs/apk/debug/app-debug.apk
```

---

## 📱 Installer l'APK sur ton téléphone

**Option A — Câble USB :**
1. Active le « Mode développeur » (Paramètres → À propos → appuie 7× sur Numéro de build)
2. Active « Débogage USB »
3. Connecte le câble, Android Studio propose d'installer directement

**Option B — Fichier APK :**
1. Transfère `app-debug.apk` sur ton téléphone (Drive, email, USB)
2. Ouvre le fichier sur le téléphone
3. Autorise « Sources inconnues » si demandé
4. Installe !

---

## 🗂 Structure du projet

```
culturebot-apk/
├── src/
│   ├── index.html      # Point d'entrée HTML
│   ├── main.js         # UI complète + logique
│   └── facts.js        # 200+ anecdotes hors ligne
├── android/            # Généré par : npx cap add android
│   └── app/src/main/
│       └── AndroidManifest.xml  ← remplacer par le nôtre
├── dist/               # Généré par : npm run build
├── AndroidManifest.xml # Notre manifest avec les permissions
├── capacitor.config.ts
├── vite.config.js
└── package.json
```

---

## ➕ Ajouter des anecdotes

Ouvre `src/facts.js` et ajoute une entrée dans le tableau `FACTS` :

```js
{ id: 201, cat: "science", text: "Ton anecdote ici." },
```

Catégories disponibles : `science`, `histoire`, `geo`, `art`, `tech`, `nature`

Puis rebuild :
```bash
npm run build && npx cap sync android
```

---

## 🌐 Publier sur le Play Store (optionnel)

1. Génère un APK signé dans Android Studio (Build → Generate Signed APK)
2. Crée un compte Google Play Developer (25 $ unique)
3. Soumets l'APK dans la [Play Console](https://play.google.com/console)

---

## 📄 Licence

MIT
