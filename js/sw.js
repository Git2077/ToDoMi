// Name des Cache-Speichers - wird für Versionierung verwendet
// Bei Änderungen der Version werden alte Caches gelöscht
const CACHE_NAME = 'sitzzaehler-v1';

// Liste aller Dateien, die für die Offline-Funktionalität gecacht werden sollen
// Diese Dateien werden beim Installieren des Service Workers heruntergeladen
const BASE_URL = self.location.pathname.replace(/\/[^/]*$/, '');
const ASSETS = [
  `${BASE_URL}/`,
  `${BASE_URL}/index.html`,
  `${BASE_URL}/css/style.css`,
  `${BASE_URL}/js/app.js`,
  `${BASE_URL}/manifest.json`,
  `${BASE_URL}/icons/icon-192x192.png`,
  `${BASE_URL}/icons/icon-512x512.png`,
  `${BASE_URL}/icons/favicon-16x16.png`,
  `${BASE_URL}/icons/favicon-32x32.png`,
  `${BASE_URL}/favicon.ico`
];

// INSTALLATION
// Wird ausgeführt, wenn der Service Worker zum ersten Mal installiert wird
// oder wenn eine neue Version verfügbar ist
self.addEventListener('install', (event) => {
  // waitUntil() stellt sicher, dass die Installation erst als abgeschlossen gilt,
  // wenn alle Dateien gecacht wurden
  event.waitUntil(
    // Öffne oder erstelle einen neuen Cache mit dem definierten Namen
    caches.open(CACHE_NAME)
      .then((cache) => {
        // Füge alle definierten Dateien zum Cache hinzu
        return cache.addAll(ASSETS)
      })
  );
});

// AKTIVIERUNG
// Wird ausgeführt, wenn ein neuer Service Worker die Kontrolle übernimmt
// Hier können alte Cache-Versionen gelöscht werden
self.addEventListener('activate', (event) => {
  event.waitUntil(
    // Hole alle vorhandenen Cache-Namen
    caches.keys().then((cacheNames) => {
      // Für jeden Cache-Namen
      return Promise.all(
        cacheNames
          // Filtere alle Cache-Namen, die nicht dem aktuellen entsprechen
          .filter((name) => name !== CACHE_NAME)
          // Lösche alle alten Caches
          .map((name) => caches.delete(name))
      );
    })
  );
});

// FETCH (NETZWERK-ANFRAGEN)
// Wird bei jeder Netzwerk-Anfrage ausgeführt
// Implementiert die "Cache-First" Strategie
self.addEventListener('fetch', (event) => {
  event.respondWith(
    // Suche zuerst im Cache nach der angefragten Ressource
    caches.match(event.request)
      .then((response) => {
        // Wenn die Ressource im Cache gefunden wurde, gib sie zurück
        // Ansonsten hole sie vom Netzwerk
        return response || fetch(event.request)
      })
  );
}); 