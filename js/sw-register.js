if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('./js/sw.js');
      console.log('ServiceWorker registration successful');
      
      // Überprüfen auf Updates
      registration.addEventListener('updatefound', () => {
        console.log('Neue Service Worker Version verfügbar');
      });
    } catch (err) {
      console.error('ServiceWorker registration failed: ', err);
    }
  });
} 