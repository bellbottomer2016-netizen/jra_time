// Web Worker to handle timer ticks
// This runs in a separate thread and is less likely to be throttled by the browser in background tabs.

self.onmessage = function (e) {
    if (e.data === 'start') {
        setInterval(() => {
            self.postMessage('tick');
        }, 1000);
    }
};
