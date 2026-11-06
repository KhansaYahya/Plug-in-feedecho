/* XMLHttpRequest fetch polyfill for IE11 / Office WebView */

function xhrFetch(url, options) {
  var opts = options || {};
  return new Promise(function (resolve, reject) {
    var xhr = new XMLHttpRequest();
    xhr.open((opts.method || "GET").toUpperCase(), url, true);

    var headers = opts.headers || {};
    var key;
    for (key in headers) {
      if (Object.prototype.hasOwnProperty.call(headers, key)) {
        xhr.setRequestHeader(key, headers[key]);
      }
    }

    xhr.onload = function () {
      var body = xhr.responseText;
      resolve({
        ok: xhr.status >= 200 && xhr.status < 300,
        status: xhr.status,
        json: function () {
          try {
            return Promise.resolve(JSON.parse(body || "null"));
          } catch (error) {
            return Promise.reject(error);
          }
        },
        text: function () {
          return Promise.resolve(body);
        },
      });
    };

    xhr.onerror = function () {
      reject(new TypeError("Failed to fetch"));
    };

    xhr.send(opts.body || null);
  });
}

if (typeof window !== "undefined" && typeof window.fetch !== "function") {
  window.fetch = xhrFetch;
}

module.exports = xhrFetch;
