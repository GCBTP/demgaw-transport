# DemGaw Transport — Build Mobile (Android & iOS)

Stack : React + Vite + Capacitor

---

## Prérequis

| Outil | Version minimale | Lien |
|---|---|---|
| Node.js | 18+ | nodejs.org |
| Android Studio | Hedgehog+ | developer.android.com |
| Xcode | 15+ (macOS uniquement) | App Store |
| JDK | 17 | adoptium.net |

---

## 1. Première installation

```bash
# Installer les dépendances
npm install

# Ajouter les plateformes (une seule fois)
npx cap add android
npx cap add ios       # macOS uniquement
```

---

## 2. Build Android (APK / AAB)

```bash
# Construire l'app web et synchroniser avec Capacitor
npm run build:mobile

# Ouvrir Android Studio
npm run cap:android
```

Dans Android Studio :
- **APK debug** : Build → Build APK(s)
- **APK release** : Build → Generate Signed Bundle/APK → APK
- **AAB (Play Store)** : Build → Generate Signed Bundle/APK → Android App Bundle

Le fichier généré se trouve dans :
`android/app/build/outputs/apk/release/app-release.apk`

---

## 3. Build iOS (IPA) — macOS uniquement

```bash
npm run build:mobile
npm run cap:ios
```

Dans Xcode :
- Sélectionner l'appareil cible ou "Any iOS Device"
- Product → Archive
- Distribute App → App Store Connect ou Ad Hoc

---

## 4. Permissions

### Android
Après `npx cap add android`, copier les permissions de `mobile/AndroidManifest.xml`
dans `android/app/src/main/AndroidManifest.xml`.

### iOS
Après `npx cap add ios`, ajouter les clés de `mobile/Info.plist.additions.xml`
dans `ios/App/App/Info.plist`.

---

## 5. Icônes et Splash Screen

Générer les icônes pour toutes les tailles :

```bash
npm install @capacitor/assets --save-dev
npx @capacitor/assets generate --iconBackgroundColor '#00853F' --splashBackgroundColor '#00853F'
```

Placer au préalable :
- `assets/icon.png` — 1024×1024px (logo sur fond vert)
- `assets/splash.png` — 2732×2732px (logo centré sur fond vert)

---

## 6. Mise à jour après modification du code

```bash
npm run build:mobile   # rebuild + sync
# Puis relancer Android Studio ou Xcode pour tester
```

---

## 7. Variables d'environnement

Les variables Supabase sont dans `.env` (non commité).
Pour le build mobile, elles sont intégrées au moment du `vite build` — aucune configuration supplémentaire nécessaire.

---

## App IDs

| Plateforme | ID |
|---|---|
| Android | `sn.demgaw.transport` |
| iOS | `sn.demgaw.transport` |
