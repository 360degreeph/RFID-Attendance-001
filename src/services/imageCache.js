/**
 * Web-based Image Cacher for PWA
 */
export const prefetchImages = async (students, logoUrl = null, onProgress = null) => {
  const tasks = [...students];
  if (logoUrl) tasks.push({ photo: logoUrl, name: 'School Logo' });
  
  const total = tasks.length;
  let completed = 0;

  let cache;
  try {
    cache = await caches.open('media-cache');
  } catch (e) {
    console.warn('Cache API not supported or accessible');
  }

  const promises = tasks.map(async (item) => {
    const url = item.photo;
    if (!url) {
      completed++;
      if (onProgress) onProgress(Math.round((completed / total) * 100));
      return;
    }
    
    try {
      if (cache) {
        const cachedResponse = await cache.match(url);
        if (!cachedResponse) {
          // fetch with no-cors to allow caching opaque responses from Google Drive
          const request = new Request(url, { mode: 'no-cors' });
          const response = await fetch(request);
          await cache.put(request, response);
        }
      }
    } catch (error) {
      console.warn(`Failed to cache media for ${item.name || 'Unknown'}:`, error);
    } finally {
      completed++;
      if (onProgress) onProgress(Math.round((completed / total) * 100));
    }
  });

  return Promise.all(promises);
};

export const getCachedImageUrl = async (url) => {
  // In a PWA with Workbox, the Service Worker automatically intercepts 
  // <img src={url}> and serves it from the cache if offline.
  // So we just return the original URL.
  return url;
};
