const CACHE_NAME = "FDX cache";

function setAppBadge(count) {
    const c = Number.parseInt(count, 10);
    if (navigator.setAppBadge && navigator.clearAppBadge) {
        if (c) {
            navigator.setAppBadge(c);
        } else {
            navigator.clearAppBadge();
        }
    }
}

function showNotification(messageData) {
    const { data } = messageData;
    if (!data) {
        return;
    }
    const teamId = data.team_id;
    const channelId = data.channel_id;
    const redirectTo = channelId ? `/_redirect/${channelId}` : "/";

    const options = {
        icon: data.override_icon_url
            ? data.override_icon_url
            : "/static/icon_144x144.png",
        tag: data.ack_id ?? "",
        body: "新規メッセージを受信しました。",
        data: {
            redirectTo,
            teamId,
            channelId,
        },
    };
    setAppBadge(data.badge);
    self.registration.showNotification("RemoTalk", options);
}

function clearNotification(messageData) {
    self.registration.getNotifications().then((notifications) => {
        notifications.forEach((x) => {
            x.close();
        });
    });
    updateBadge(messageData);
}

function updateBadge(messageData) {
    const { data } = messageData;
    if (!data) {
        return;
    }
    setAppBadge(data.badge);
}

function showSessionExpireNotification(messageData) {
    const { data } = messageData;
    if (!data) {
        return;
    }
    const redirectTo = "/login";
    const options = {
        icon: data.override_icon_url
            ? data.override_icon_url
            : "/static/icon_144x144.png",
        tag: data.ack_id ?? "",
        body: "セッション有効期限切れ",
        data: { redirectTo },
    };
    self.registration.showNotification("RemoTalk", options);
}

async function deleteAllCaches() {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map((x) => caches.delete(x)));
}

/**
 *
 * @param {Request} req
 * @returns {bool}
 */
function shouldFetch(req) {
    try {
        const u = new URL(req.url);
        return (
            u.origin !== self.location.origin ||
            !u.pathname.startsWith("/static") ||
            req.method !== "GET"
        );
    } catch {
        return true;
    }
}

const errorPage = `<html>
<h1>Oops...</h1>
<p>Looks like something went wrong! Please check your internet connection and try to reload the page.</p>
</html>`;

/**
 *
 * @param {Request} req
 * @returns {Promise<Response>}
 */
async function respondWithCache(req) {
    const cachedData = await caches.match(req);
    if (cachedData) {
        return cachedData;
    }

    try {
        const resp = await fetch(req);
        const cloned = resp.clone();
        if (!cloned || cloned.status !== 200) {
            return resp;
        }
        const cache = await caches.open(CACHE_NAME);
        await cache.put(req, cloned);
        return resp;
    } catch (error) {
        return new Response(errorPage, {
            status: 503,
            headers: new Headers({ "Content-Type": "text/html" }),
        });
    }
}

self.addEventListener("install", (event) => {
    self.skipWaiting();
    const onInstall = Promise.all([
        deleteAllCaches(),
    ])
    event.waitUntil(onInstall)
});

self.addEventListener("activate", (event) => {
    const onActivate = Promise.all([
        self.clients.claim(),
    ]);
    event.waitUntil(onActivate);
});

self.addEventListener("fetch", (event) => {
    const requestToFetch = event.request.clone();

    if (shouldFetch(requestToFetch)) {
        return;
    }
    event.respondWith(respondWithCache(requestToFetch));
});

self.addEventListener("message", (event) => {
    if (event.data.type === "CACHE_URLS") {
        const urlsToAdd = event.data.payload;
        event.waitUntil(
            caches.open(CACHE_NAME).then((cache) => {
                return cache.addAll(urlsToAdd);
            })
        );
    }
});

self.addEventListener("push", (event) => {
    const messageData = event.data?.json();
    console.log(messageData);
    const data = messageData.data;
    if (!data) {
        return;
    }

    switch (data.type) {
        case "message":
            showNotification(messageData);
            break;
        case "clear":
            clearNotification(messageData);
            break;
        case "update_badge":
            updateBadge(messageData);
            break;
        case "session":
            showSessionExpireNotification(messageData);
            break;
        default:
            break;
    }
});

self.addEventListener("notificationclick", (event) => {
    event.notification.close();
    const { data } = event.notification;
    const redirect = async () => {
        const clientList = await self.clients.matchAll({ type: "window" });
        for (let i = 0; i < clientList.length; i++) {
            const client = clientList[i];
            if (client.postMessage && data.channelId) {
                client.postMessage({
                    type: "notification-clicked",
                    message: {
                        channel: { id: data.channelId },
                        teamId: data.teamId,
                    },
                });
            }
            if (client.focus) {
                client.focus();
                return;
            }
        }
        if (self.clients.openWindow) {
            const windowClient = await self.clients.openWindow(
                data.redirectTo ? data.redirectTo : "/"
            );
            if (windowClient && windowClient.focus) {
                windowClient.focus();
            }
        }
    };
    event.waitUntil(redirect());
});
