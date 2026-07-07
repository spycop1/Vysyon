VYSYON GITHUB PWA - EINFACHER UPLOAD
=====================================

1) Diese ZIP entpacken.
2) NICHT die ZIP hochladen.
3) Den kompletten INHALT des entpackten Ordners in dein GitHub Repository "Vysyon" hochladen.
4) GitHub -> Settings -> Pages:
   - Source: Deploy from a branch
   - Branch: main
   - Folder: / (root)
5) Öffnen:
   https://spycop1.github.io/Vysyon/
6) Android Chrome:
   Menü ⋮ -> App installieren
7) iPhone Safari:
   Teilen -> Zum Home-Bildschirm

WICHTIG
=======
Diese Version läuft auf GitHub Pages ohne Electron.
Die Oberfläche, Scanner-Logik, COT, Macro und AI bleiben im Browser.

Warum Price Feeds lokal besser laufen können:
- Die EXE läuft in Electron und darf mehr.
- GitHub Pages läuft im Browser und hat CORS-Sicherheitsregeln.
- Deshalb kann Yahoo/Stooq im Browser blockieren.

Was diese Version verbessert:
- PWA-Dateien enthalten: manifest.json, service-worker.js, Icons
- index.html liegt direkt im Root, passend für GitHub Pages
- CSP für Browser/GitHub angepasst
- github-adapter.js ergänzt:
  - versucht zusätzliche öffentliche Fallbacks für Yahoo/Stooq
  - unterstützt optional einen eigenen Vysyon Data Proxy
  - fügt im Settings-Bereich ein Feld "Vysyon Data Proxy URL" ein

OPTIONAL: STABILER PRICE FEED MIT CLOUDFLARE WORKER
===================================================
Wenn du von z.B. "price feed 10/55" näher Richtung 40/55+ willst,
ist der sauberste Weg ein kleiner kostenloser Cloudflare Worker.

Datei im Paket:
  vysyon-data-proxy-worker.js

Vorgehen sehr grob:
1) Cloudflare.com -> Workers & Pages -> Create Worker
2) Inhalt von vysyon-data-proxy-worker.js einfügen
3) Deploy
4) Deine Worker-URL kopieren, z.B.:
   https://vysyon-data-proxy.DEINNAME.workers.dev
5) In Vysyon App -> Settings -> Vysyon Data Proxy URL einfügen -> Save Proxy
6) App neu laden und Scan erneut starten

Hinweis:
API Keys niemals direkt in GitHub-Code schreiben.
Keys nur in der App eingeben oder später als Cloudflare Worker Secret speichern.
