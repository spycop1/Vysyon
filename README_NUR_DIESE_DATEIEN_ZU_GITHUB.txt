VYSYON GITHUB SNAPSHOT VIEWER FIX

Problem:
Wenn auf https://spycop1.github.io/Vysyon/ noch das alte Dashboard mit Scan-Button erscheint,
dann liegt auf GitHub im Root noch die Rechen-/Dashboard-Version statt des Mobile Snapshot Viewers.

Lösung:
Diese Dateien in dein GitHub Repository Vysyon hochladen und vorhandene Dateien überschreiben:

- index.html
- 404.html
- manifest.json
- service-worker.js
- icons/icon-192.svg
- icons/icon-512.svg

Wichtig:
Den Ordner data/ NICHT löschen.
Die PC-EXE veröffentlicht weiterhin nach:

data/latest-scan.json

Die Handy-Seite liest diese Datei automatisch. Auf dem Handy muss kein Scan laufen.

Nach Upload:
1. https://spycop1.github.io/Vysyon/?v=viewer2 öffnen
2. Refresh drücken
3. Falls noch altes Dashboard kommt: Browserdaten der Seite löschen oder PWA neu installieren.
