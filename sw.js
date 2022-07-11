// App version
const version = '1.0';

// static caches - app shell
const appAssets = [
    'index.html',
    'main.js',
    'images/flame.png',
    'images/logo.png',
    'images/sync.png',
    'vendor/bootstrap.min.css',
    'vendor/jquery.min.js',
];

// SW install
self.addEventListener('install', e => {
    e.waitUntil(
        caches.open(`static-${version}`).then(cache => cache.addAll(appAssets))
    )
})

// SW Activate
self.addEventListener('activate', e => {
    // clean static cache
    let cleaned = caches.keys().then(keys => {
        keys.forEach(key => {
            if (key !== `static-${version}` && key.match('static-')) {
                return caches.delete(key);
            }
        })
    });

    e.waitUntil(cleaned);
})

// SW cache strategy - cache with network fallback
const staticCache = (req, cacheName = `static-${version}`) => {
    return caches.match(req).then(cachedRes => {
        // Return cached response if found
        if (cachedRes) return cachedRes;

        // Fallback to network
        return fetch(req).then(networkRes => {
            // Update cache with new response
            caches.open(cacheName).then(cache => cache.put(req, networkRes));

            // Return clone of network response
            return networkRes.clone();
        })
    })
}

const fallbackCache = (req) => {
    // Try network
    return fetch(req).then(networkRes => {

        // Check res is OK, else go to cache
        if (!networkRes.ok) throw 'Fetch Error';

        // Update cache
        caches.open(`static-${version}`).then(
            cache => cache.put(req, networkRes)
        );

        // Return Clone of Network response
        return networkRes.clone();

    })
    .catch(err => caches.match(req))
}

// Clean old giphys from the 'giphy' cache
const cleanGiphyCache = (giphys) => {
    caches.open('giphy').then(cache => {
        // get all cache entries
        caches.keys().then(keys => {
            // loop entries (requests)
            keys.forEach(key => {
                // if entry is NOT of current Giphys, delete it
                if (!giphys.includes(key.url)) cache.delete(key);
            })
        })
    })
}

// SW fetch
self.addEventListener('fetch', e => {
    // App Shell
    if (e.request.url.match(location.origin)) {
        e.respondWith(staticCache(e.request));
    // Giphy API
    } else if (e.request.url.match('api.giphy.com/v1/gifs/trending')) {
        e.respondWith(fallbackCache(e.request));
    // Giphy Media    
    } else if (e.request.url.match('giphy.com/media')) {
        e.respondWith(staticCache(e.request, 'giphy'));
    }
})

// Listen for message from the client
self.addEventListener('message', e => {
    // identify the message
    if (e.data.action === 'cleanGiphyCache') cleanGiphyCache(e.data.giphys);
})