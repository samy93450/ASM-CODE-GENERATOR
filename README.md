# ASM Code Generator

Générateur automatique et manuel, historique local, scan de QR codes et codes-barres, export PNG des cartes.

## Windows 11 x64

Installe Node.js 24 LTS, ouvre PowerShell à la racine du dossier décompressé et exécute :

```powershell
npm ci
npm run check
npm start
```

Ferme la fenêtre de l’application, puis compile :

```powershell
npm run dist:win
```

Le dossier `release` reçoit l’installateur **Setup** et l’EXE **Portable**. Les exécutables sont configurés sans certificat de signature. L’icône multirésolution se trouve dans `build/asm-code-generator.ico`.

Pour **ALPHA INSTALLER PRO**, importe le ZIP comme projet Electron. Le fichier `package.json`, le point d’entrée `main.cjs` et `index.html` se trouvent à la racine. La commande ci-dessus est celle du projet pour produire les deux EXE.

## Dépôt GitHub et version web

1. Crée un dépôt GitHub vide. Décompresse le ZIP et place **son contenu** à la racine du dépôt, y compris `.github` et `.gitignore`.
2. Envoie les fichiers sur la branche `main`. Dans **Settings → Pages → Build and deployment**, sélectionne **GitHub Actions** comme source.
3. Dans **Actions**, lance **Publier sur GitHub Pages → Run workflow**. Le lien du site apparaît dans le résultat du déploiement.
4. Pour compiler les EXE à distance, lance **Compiler les EXE Windows → Run workflow**. Les deux exécutables sont accessibles dans **Artifacts → ASM-Code-Generator-Windows-x64** de l’exécution réussie. Tu peux les joindre à une Release GitHub.

Le workflow Pages prépare uniquement les fichiers web. L’historique reste local à chaque navigateur ou installation Electron. La publication web et la version Windows n’importent pas automatiquement les cartes du site privé.

Le décodeur ZXing 0.21.3 est embarqué dans `vendor/`, avec sa licence.
