/******/ (function() { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ "./src/polyfills/fetch.js":
/*!********************************!*\
  !*** ./src/polyfills/fetch.js ***!
  \********************************/
/***/ (function(module, __unused_webpack_exports, __webpack_require__) {

/* provided dependency */ var Promise = __webpack_require__(/*! es6-promise */ "./node_modules/es6-promise/dist/es6-promise.js").Promise;
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
        json: function json() {
          try {
            return Promise.resolve(JSON.parse(body || "null"));
          } catch (error) {
            return Promise.reject(error);
          }
        },
        text: function text() {
          return Promise.resolve(body);
        }
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

/***/ }),

/***/ "./src/taskpane/config.js":
/*!********************************!*\
  !*** ./src/taskpane/config.js ***!
  \********************************/
/***/ (function(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   BACKEND_URL: function() { return /* binding */ BACKEND_URL; },
/* harmony export */   FIREBASE_WEB_API_KEY: function() { return /* binding */ FIREBASE_WEB_API_KEY; },
/* harmony export */   SIGNUP_URL: function() { return /* binding */ SIGNUP_URL; }
/* harmony export */ });
// FeedEcho backend origin (no trailing slash). Login is POST {BACKEND_URL}/api/auth/login
var BACKEND_URL = "https://feedecho-api.onrender.com";

// Public Firebase web API key from the existing client app (used to exchange email/password for an idToken)
var FIREBASE_WEB_API_KEY = "AIzaSyBbQFz2Cy0sVTo1eZXh5gt0WWm_diJUI1I";

// Placeholder website sign-up URL (replace with the real FeedEcho sign-up page)
var SIGNUP_URL = "https://feedecho-web.onrender.com/host/signup";

/***/ }),

/***/ "./node_modules/es6-promise/dist/es6-promise.js":
/*!******************************************************!*\
  !*** ./node_modules/es6-promise/dist/es6-promise.js ***!
  \******************************************************/
/***/ (function(module, __unused_webpack_exports, __webpack_require__) {

/*!
 * @overview es6-promise - a tiny implementation of Promises/A+.
 * @copyright Copyright (c) 2014 Yehuda Katz, Tom Dale, Stefan Penner and contributors (Conversion to ES6 API by Jake Archibald)
 * @license   Licensed under MIT license
 *            See https://raw.githubusercontent.com/stefanpenner/es6-promise/master/LICENSE
 * @version   v4.2.8+1e68dce6
 */

(function (global, factory) {
	 true ? module.exports = factory() :
	0;
}(this, (function () { 'use strict';

function objectOrFunction(x) {
  var type = typeof x;
  return x !== null && (type === 'object' || type === 'function');
}

function isFunction(x) {
  return typeof x === 'function';
}



var _isArray = void 0;
if (Array.isArray) {
  _isArray = Array.isArray;
} else {
  _isArray = function (x) {
    return Object.prototype.toString.call(x) === '[object Array]';
  };
}

var isArray = _isArray;

var len = 0;
var vertxNext = void 0;
var customSchedulerFn = void 0;

var asap = function asap(callback, arg) {
  queue[len] = callback;
  queue[len + 1] = arg;
  len += 2;
  if (len === 2) {
    // If len is 2, that means that we need to schedule an async flush.
    // If additional callbacks are queued before the queue is flushed, they
    // will be processed by this flush that we are scheduling.
    if (customSchedulerFn) {
      customSchedulerFn(flush);
    } else {
      scheduleFlush();
    }
  }
};

function setScheduler(scheduleFn) {
  customSchedulerFn = scheduleFn;
}

function setAsap(asapFn) {
  asap = asapFn;
}

var browserWindow = typeof window !== 'undefined' ? window : undefined;
var browserGlobal = browserWindow || {};
var BrowserMutationObserver = browserGlobal.MutationObserver || browserGlobal.WebKitMutationObserver;
var isNode = typeof self === 'undefined' && typeof process !== 'undefined' && {}.toString.call(process) === '[object process]';

// test for web worker but not in IE10
var isWorker = typeof Uint8ClampedArray !== 'undefined' && typeof importScripts !== 'undefined' && typeof MessageChannel !== 'undefined';

// node
function useNextTick() {
  // node version 0.10.x displays a deprecation warning when nextTick is used recursively
  // see https://github.com/cujojs/when/issues/410 for details
  return function () {
    return process.nextTick(flush);
  };
}

// vertx
function useVertxTimer() {
  if (typeof vertxNext !== 'undefined') {
    return function () {
      vertxNext(flush);
    };
  }

  return useSetTimeout();
}

function useMutationObserver() {
  var iterations = 0;
  var observer = new BrowserMutationObserver(flush);
  var node = document.createTextNode('');
  observer.observe(node, { characterData: true });

  return function () {
    node.data = iterations = ++iterations % 2;
  };
}

// web worker
function useMessageChannel() {
  var channel = new MessageChannel();
  channel.port1.onmessage = flush;
  return function () {
    return channel.port2.postMessage(0);
  };
}

function useSetTimeout() {
  // Store setTimeout reference so es6-promise will be unaffected by
  // other code modifying setTimeout (like sinon.useFakeTimers())
  var globalSetTimeout = setTimeout;
  return function () {
    return globalSetTimeout(flush, 1);
  };
}

var queue = new Array(1000);
function flush() {
  for (var i = 0; i < len; i += 2) {
    var callback = queue[i];
    var arg = queue[i + 1];

    callback(arg);

    queue[i] = undefined;
    queue[i + 1] = undefined;
  }

  len = 0;
}

function attemptVertx() {
  try {
    var vertx = Function('return this')().require('vertx');
    vertxNext = vertx.runOnLoop || vertx.runOnContext;
    return useVertxTimer();
  } catch (e) {
    return useSetTimeout();
  }
}

var scheduleFlush = void 0;
// Decide what async method to use to triggering processing of queued callbacks:
if (isNode) {
  scheduleFlush = useNextTick();
} else if (BrowserMutationObserver) {
  scheduleFlush = useMutationObserver();
} else if (isWorker) {
  scheduleFlush = useMessageChannel();
} else if (browserWindow === undefined && "function" === 'function') {
  scheduleFlush = attemptVertx();
} else {
  scheduleFlush = useSetTimeout();
}

function then(onFulfillment, onRejection) {
  var parent = this;

  var child = new this.constructor(noop);

  if (child[PROMISE_ID] === undefined) {
    makePromise(child);
  }

  var _state = parent._state;


  if (_state) {
    var callback = arguments[_state - 1];
    asap(function () {
      return invokeCallback(_state, child, callback, parent._result);
    });
  } else {
    subscribe(parent, child, onFulfillment, onRejection);
  }

  return child;
}

/**
  `Promise.resolve` returns a promise that will become resolved with the
  passed `value`. It is shorthand for the following:

  ```javascript
  let promise = new Promise(function(resolve, reject){
    resolve(1);
  });

  promise.then(function(value){
    // value === 1
  });
  ```

  Instead of writing the above, your code now simply becomes the following:

  ```javascript
  let promise = Promise.resolve(1);

  promise.then(function(value){
    // value === 1
  });
  ```

  @method resolve
  @static
  @param {Any} value value that the returned promise will be resolved with
  Useful for tooling.
  @return {Promise} a promise that will become fulfilled with the given
  `value`
*/
function resolve$1(object) {
  /*jshint validthis:true */
  var Constructor = this;

  if (object && typeof object === 'object' && object.constructor === Constructor) {
    return object;
  }

  var promise = new Constructor(noop);
  resolve(promise, object);
  return promise;
}

var PROMISE_ID = Math.random().toString(36).substring(2);

function noop() {}

var PENDING = void 0;
var FULFILLED = 1;
var REJECTED = 2;

function selfFulfillment() {
  return new TypeError("You cannot resolve a promise with itself");
}

function cannotReturnOwn() {
  return new TypeError('A promises callback cannot return that same promise.');
}

function tryThen(then$$1, value, fulfillmentHandler, rejectionHandler) {
  try {
    then$$1.call(value, fulfillmentHandler, rejectionHandler);
  } catch (e) {
    return e;
  }
}

function handleForeignThenable(promise, thenable, then$$1) {
  asap(function (promise) {
    var sealed = false;
    var error = tryThen(then$$1, thenable, function (value) {
      if (sealed) {
        return;
      }
      sealed = true;
      if (thenable !== value) {
        resolve(promise, value);
      } else {
        fulfill(promise, value);
      }
    }, function (reason) {
      if (sealed) {
        return;
      }
      sealed = true;

      reject(promise, reason);
    }, 'Settle: ' + (promise._label || ' unknown promise'));

    if (!sealed && error) {
      sealed = true;
      reject(promise, error);
    }
  }, promise);
}

function handleOwnThenable(promise, thenable) {
  if (thenable._state === FULFILLED) {
    fulfill(promise, thenable._result);
  } else if (thenable._state === REJECTED) {
    reject(promise, thenable._result);
  } else {
    subscribe(thenable, undefined, function (value) {
      return resolve(promise, value);
    }, function (reason) {
      return reject(promise, reason);
    });
  }
}

function handleMaybeThenable(promise, maybeThenable, then$$1) {
  if (maybeThenable.constructor === promise.constructor && then$$1 === then && maybeThenable.constructor.resolve === resolve$1) {
    handleOwnThenable(promise, maybeThenable);
  } else {
    if (then$$1 === undefined) {
      fulfill(promise, maybeThenable);
    } else if (isFunction(then$$1)) {
      handleForeignThenable(promise, maybeThenable, then$$1);
    } else {
      fulfill(promise, maybeThenable);
    }
  }
}

function resolve(promise, value) {
  if (promise === value) {
    reject(promise, selfFulfillment());
  } else if (objectOrFunction(value)) {
    var then$$1 = void 0;
    try {
      then$$1 = value.then;
    } catch (error) {
      reject(promise, error);
      return;
    }
    handleMaybeThenable(promise, value, then$$1);
  } else {
    fulfill(promise, value);
  }
}

function publishRejection(promise) {
  if (promise._onerror) {
    promise._onerror(promise._result);
  }

  publish(promise);
}

function fulfill(promise, value) {
  if (promise._state !== PENDING) {
    return;
  }

  promise._result = value;
  promise._state = FULFILLED;

  if (promise._subscribers.length !== 0) {
    asap(publish, promise);
  }
}

function reject(promise, reason) {
  if (promise._state !== PENDING) {
    return;
  }
  promise._state = REJECTED;
  promise._result = reason;

  asap(publishRejection, promise);
}

function subscribe(parent, child, onFulfillment, onRejection) {
  var _subscribers = parent._subscribers;
  var length = _subscribers.length;


  parent._onerror = null;

  _subscribers[length] = child;
  _subscribers[length + FULFILLED] = onFulfillment;
  _subscribers[length + REJECTED] = onRejection;

  if (length === 0 && parent._state) {
    asap(publish, parent);
  }
}

function publish(promise) {
  var subscribers = promise._subscribers;
  var settled = promise._state;

  if (subscribers.length === 0) {
    return;
  }

  var child = void 0,
      callback = void 0,
      detail = promise._result;

  for (var i = 0; i < subscribers.length; i += 3) {
    child = subscribers[i];
    callback = subscribers[i + settled];

    if (child) {
      invokeCallback(settled, child, callback, detail);
    } else {
      callback(detail);
    }
  }

  promise._subscribers.length = 0;
}

function invokeCallback(settled, promise, callback, detail) {
  var hasCallback = isFunction(callback),
      value = void 0,
      error = void 0,
      succeeded = true;

  if (hasCallback) {
    try {
      value = callback(detail);
    } catch (e) {
      succeeded = false;
      error = e;
    }

    if (promise === value) {
      reject(promise, cannotReturnOwn());
      return;
    }
  } else {
    value = detail;
  }

  if (promise._state !== PENDING) {
    // noop
  } else if (hasCallback && succeeded) {
    resolve(promise, value);
  } else if (succeeded === false) {
    reject(promise, error);
  } else if (settled === FULFILLED) {
    fulfill(promise, value);
  } else if (settled === REJECTED) {
    reject(promise, value);
  }
}

function initializePromise(promise, resolver) {
  try {
    resolver(function resolvePromise(value) {
      resolve(promise, value);
    }, function rejectPromise(reason) {
      reject(promise, reason);
    });
  } catch (e) {
    reject(promise, e);
  }
}

var id = 0;
function nextId() {
  return id++;
}

function makePromise(promise) {
  promise[PROMISE_ID] = id++;
  promise._state = undefined;
  promise._result = undefined;
  promise._subscribers = [];
}

function validationError() {
  return new Error('Array Methods must be provided an Array');
}

var Enumerator = function () {
  function Enumerator(Constructor, input) {
    this._instanceConstructor = Constructor;
    this.promise = new Constructor(noop);

    if (!this.promise[PROMISE_ID]) {
      makePromise(this.promise);
    }

    if (isArray(input)) {
      this.length = input.length;
      this._remaining = input.length;

      this._result = new Array(this.length);

      if (this.length === 0) {
        fulfill(this.promise, this._result);
      } else {
        this.length = this.length || 0;
        this._enumerate(input);
        if (this._remaining === 0) {
          fulfill(this.promise, this._result);
        }
      }
    } else {
      reject(this.promise, validationError());
    }
  }

  Enumerator.prototype._enumerate = function _enumerate(input) {
    for (var i = 0; this._state === PENDING && i < input.length; i++) {
      this._eachEntry(input[i], i);
    }
  };

  Enumerator.prototype._eachEntry = function _eachEntry(entry, i) {
    var c = this._instanceConstructor;
    var resolve$$1 = c.resolve;


    if (resolve$$1 === resolve$1) {
      var _then = void 0;
      var error = void 0;
      var didError = false;
      try {
        _then = entry.then;
      } catch (e) {
        didError = true;
        error = e;
      }

      if (_then === then && entry._state !== PENDING) {
        this._settledAt(entry._state, i, entry._result);
      } else if (typeof _then !== 'function') {
        this._remaining--;
        this._result[i] = entry;
      } else if (c === Promise$1) {
        var promise = new c(noop);
        if (didError) {
          reject(promise, error);
        } else {
          handleMaybeThenable(promise, entry, _then);
        }
        this._willSettleAt(promise, i);
      } else {
        this._willSettleAt(new c(function (resolve$$1) {
          return resolve$$1(entry);
        }), i);
      }
    } else {
      this._willSettleAt(resolve$$1(entry), i);
    }
  };

  Enumerator.prototype._settledAt = function _settledAt(state, i, value) {
    var promise = this.promise;


    if (promise._state === PENDING) {
      this._remaining--;

      if (state === REJECTED) {
        reject(promise, value);
      } else {
        this._result[i] = value;
      }
    }

    if (this._remaining === 0) {
      fulfill(promise, this._result);
    }
  };

  Enumerator.prototype._willSettleAt = function _willSettleAt(promise, i) {
    var enumerator = this;

    subscribe(promise, undefined, function (value) {
      return enumerator._settledAt(FULFILLED, i, value);
    }, function (reason) {
      return enumerator._settledAt(REJECTED, i, reason);
    });
  };

  return Enumerator;
}();

/**
  `Promise.all` accepts an array of promises, and returns a new promise which
  is fulfilled with an array of fulfillment values for the passed promises, or
  rejected with the reason of the first passed promise to be rejected. It casts all
  elements of the passed iterable to promises as it runs this algorithm.

  Example:

  ```javascript
  let promise1 = resolve(1);
  let promise2 = resolve(2);
  let promise3 = resolve(3);
  let promises = [ promise1, promise2, promise3 ];

  Promise.all(promises).then(function(array){
    // The array here would be [ 1, 2, 3 ];
  });
  ```

  If any of the `promises` given to `all` are rejected, the first promise
  that is rejected will be given as an argument to the returned promises's
  rejection handler. For example:

  Example:

  ```javascript
  let promise1 = resolve(1);
  let promise2 = reject(new Error("2"));
  let promise3 = reject(new Error("3"));
  let promises = [ promise1, promise2, promise3 ];

  Promise.all(promises).then(function(array){
    // Code here never runs because there are rejected promises!
  }, function(error) {
    // error.message === "2"
  });
  ```

  @method all
  @static
  @param {Array} entries array of promises
  @param {String} label optional string for labeling the promise.
  Useful for tooling.
  @return {Promise} promise that is fulfilled when all `promises` have been
  fulfilled, or rejected if any of them become rejected.
  @static
*/
function all(entries) {
  return new Enumerator(this, entries).promise;
}

/**
  `Promise.race` returns a new promise which is settled in the same way as the
  first passed promise to settle.

  Example:

  ```javascript
  let promise1 = new Promise(function(resolve, reject){
    setTimeout(function(){
      resolve('promise 1');
    }, 200);
  });

  let promise2 = new Promise(function(resolve, reject){
    setTimeout(function(){
      resolve('promise 2');
    }, 100);
  });

  Promise.race([promise1, promise2]).then(function(result){
    // result === 'promise 2' because it was resolved before promise1
    // was resolved.
  });
  ```

  `Promise.race` is deterministic in that only the state of the first
  settled promise matters. For example, even if other promises given to the
  `promises` array argument are resolved, but the first settled promise has
  become rejected before the other promises became fulfilled, the returned
  promise will become rejected:

  ```javascript
  let promise1 = new Promise(function(resolve, reject){
    setTimeout(function(){
      resolve('promise 1');
    }, 200);
  });

  let promise2 = new Promise(function(resolve, reject){
    setTimeout(function(){
      reject(new Error('promise 2'));
    }, 100);
  });

  Promise.race([promise1, promise2]).then(function(result){
    // Code here never runs
  }, function(reason){
    // reason.message === 'promise 2' because promise 2 became rejected before
    // promise 1 became fulfilled
  });
  ```

  An example real-world use case is implementing timeouts:

  ```javascript
  Promise.race([ajax('foo.json'), timeout(5000)])
  ```

  @method race
  @static
  @param {Array} promises array of promises to observe
  Useful for tooling.
  @return {Promise} a promise which settles in the same way as the first passed
  promise to settle.
*/
function race(entries) {
  /*jshint validthis:true */
  var Constructor = this;

  if (!isArray(entries)) {
    return new Constructor(function (_, reject) {
      return reject(new TypeError('You must pass an array to race.'));
    });
  } else {
    return new Constructor(function (resolve, reject) {
      var length = entries.length;
      for (var i = 0; i < length; i++) {
        Constructor.resolve(entries[i]).then(resolve, reject);
      }
    });
  }
}

/**
  `Promise.reject` returns a promise rejected with the passed `reason`.
  It is shorthand for the following:

  ```javascript
  let promise = new Promise(function(resolve, reject){
    reject(new Error('WHOOPS'));
  });

  promise.then(function(value){
    // Code here doesn't run because the promise is rejected!
  }, function(reason){
    // reason.message === 'WHOOPS'
  });
  ```

  Instead of writing the above, your code now simply becomes the following:

  ```javascript
  let promise = Promise.reject(new Error('WHOOPS'));

  promise.then(function(value){
    // Code here doesn't run because the promise is rejected!
  }, function(reason){
    // reason.message === 'WHOOPS'
  });
  ```

  @method reject
  @static
  @param {Any} reason value that the returned promise will be rejected with.
  Useful for tooling.
  @return {Promise} a promise rejected with the given `reason`.
*/
function reject$1(reason) {
  /*jshint validthis:true */
  var Constructor = this;
  var promise = new Constructor(noop);
  reject(promise, reason);
  return promise;
}

function needsResolver() {
  throw new TypeError('You must pass a resolver function as the first argument to the promise constructor');
}

function needsNew() {
  throw new TypeError("Failed to construct 'Promise': Please use the 'new' operator, this object constructor cannot be called as a function.");
}

/**
  Promise objects represent the eventual result of an asynchronous operation. The
  primary way of interacting with a promise is through its `then` method, which
  registers callbacks to receive either a promise's eventual value or the reason
  why the promise cannot be fulfilled.

  Terminology
  -----------

  - `promise` is an object or function with a `then` method whose behavior conforms to this specification.
  - `thenable` is an object or function that defines a `then` method.
  - `value` is any legal JavaScript value (including undefined, a thenable, or a promise).
  - `exception` is a value that is thrown using the throw statement.
  - `reason` is a value that indicates why a promise was rejected.
  - `settled` the final resting state of a promise, fulfilled or rejected.

  A promise can be in one of three states: pending, fulfilled, or rejected.

  Promises that are fulfilled have a fulfillment value and are in the fulfilled
  state.  Promises that are rejected have a rejection reason and are in the
  rejected state.  A fulfillment value is never a thenable.

  Promises can also be said to *resolve* a value.  If this value is also a
  promise, then the original promise's settled state will match the value's
  settled state.  So a promise that *resolves* a promise that rejects will
  itself reject, and a promise that *resolves* a promise that fulfills will
  itself fulfill.


  Basic Usage:
  ------------

  ```js
  let promise = new Promise(function(resolve, reject) {
    // on success
    resolve(value);

    // on failure
    reject(reason);
  });

  promise.then(function(value) {
    // on fulfillment
  }, function(reason) {
    // on rejection
  });
  ```

  Advanced Usage:
  ---------------

  Promises shine when abstracting away asynchronous interactions such as
  `XMLHttpRequest`s.

  ```js
  function getJSON(url) {
    return new Promise(function(resolve, reject){
      let xhr = new XMLHttpRequest();

      xhr.open('GET', url);
      xhr.onreadystatechange = handler;
      xhr.responseType = 'json';
      xhr.setRequestHeader('Accept', 'application/json');
      xhr.send();

      function handler() {
        if (this.readyState === this.DONE) {
          if (this.status === 200) {
            resolve(this.response);
          } else {
            reject(new Error('getJSON: `' + url + '` failed with status: [' + this.status + ']'));
          }
        }
      };
    });
  }

  getJSON('/posts.json').then(function(json) {
    // on fulfillment
  }, function(reason) {
    // on rejection
  });
  ```

  Unlike callbacks, promises are great composable primitives.

  ```js
  Promise.all([
    getJSON('/posts'),
    getJSON('/comments')
  ]).then(function(values){
    values[0] // => postsJSON
    values[1] // => commentsJSON

    return values;
  });
  ```

  @class Promise
  @param {Function} resolver
  Useful for tooling.
  @constructor
*/

var Promise$1 = function () {
  function Promise(resolver) {
    this[PROMISE_ID] = nextId();
    this._result = this._state = undefined;
    this._subscribers = [];

    if (noop !== resolver) {
      typeof resolver !== 'function' && needsResolver();
      this instanceof Promise ? initializePromise(this, resolver) : needsNew();
    }
  }

  /**
  The primary way of interacting with a promise is through its `then` method,
  which registers callbacks to receive either a promise's eventual value or the
  reason why the promise cannot be fulfilled.
   ```js
  findUser().then(function(user){
    // user is available
  }, function(reason){
    // user is unavailable, and you are given the reason why
  });
  ```
   Chaining
  --------
   The return value of `then` is itself a promise.  This second, 'downstream'
  promise is resolved with the return value of the first promise's fulfillment
  or rejection handler, or rejected if the handler throws an exception.
   ```js
  findUser().then(function (user) {
    return user.name;
  }, function (reason) {
    return 'default name';
  }).then(function (userName) {
    // If `findUser` fulfilled, `userName` will be the user's name, otherwise it
    // will be `'default name'`
  });
   findUser().then(function (user) {
    throw new Error('Found user, but still unhappy');
  }, function (reason) {
    throw new Error('`findUser` rejected and we're unhappy');
  }).then(function (value) {
    // never reached
  }, function (reason) {
    // if `findUser` fulfilled, `reason` will be 'Found user, but still unhappy'.
    // If `findUser` rejected, `reason` will be '`findUser` rejected and we're unhappy'.
  });
  ```
  If the downstream promise does not specify a rejection handler, rejection reasons will be propagated further downstream.
   ```js
  findUser().then(function (user) {
    throw new PedagogicalException('Upstream error');
  }).then(function (value) {
    // never reached
  }).then(function (value) {
    // never reached
  }, function (reason) {
    // The `PedgagocialException` is propagated all the way down to here
  });
  ```
   Assimilation
  ------------
   Sometimes the value you want to propagate to a downstream promise can only be
  retrieved asynchronously. This can be achieved by returning a promise in the
  fulfillment or rejection handler. The downstream promise will then be pending
  until the returned promise is settled. This is called *assimilation*.
   ```js
  findUser().then(function (user) {
    return findCommentsByAuthor(user);
  }).then(function (comments) {
    // The user's comments are now available
  });
  ```
   If the assimliated promise rejects, then the downstream promise will also reject.
   ```js
  findUser().then(function (user) {
    return findCommentsByAuthor(user);
  }).then(function (comments) {
    // If `findCommentsByAuthor` fulfills, we'll have the value here
  }, function (reason) {
    // If `findCommentsByAuthor` rejects, we'll have the reason here
  });
  ```
   Simple Example
  --------------
   Synchronous Example
   ```javascript
  let result;
   try {
    result = findResult();
    // success
  } catch(reason) {
    // failure
  }
  ```
   Errback Example
   ```js
  findResult(function(result, err){
    if (err) {
      // failure
    } else {
      // success
    }
  });
  ```
   Promise Example;
   ```javascript
  findResult().then(function(result){
    // success
  }, function(reason){
    // failure
  });
  ```
   Advanced Example
  --------------
   Synchronous Example
   ```javascript
  let author, books;
   try {
    author = findAuthor();
    books  = findBooksByAuthor(author);
    // success
  } catch(reason) {
    // failure
  }
  ```
   Errback Example
   ```js
   function foundBooks(books) {
   }
   function failure(reason) {
   }
   findAuthor(function(author, err){
    if (err) {
      failure(err);
      // failure
    } else {
      try {
        findBoooksByAuthor(author, function(books, err) {
          if (err) {
            failure(err);
          } else {
            try {
              foundBooks(books);
            } catch(reason) {
              failure(reason);
            }
          }
        });
      } catch(error) {
        failure(err);
      }
      // success
    }
  });
  ```
   Promise Example;
   ```javascript
  findAuthor().
    then(findBooksByAuthor).
    then(function(books){
      // found books
  }).catch(function(reason){
    // something went wrong
  });
  ```
   @method then
  @param {Function} onFulfilled
  @param {Function} onRejected
  Useful for tooling.
  @return {Promise}
  */

  /**
  `catch` is simply sugar for `then(undefined, onRejection)` which makes it the same
  as the catch block of a try/catch statement.
  ```js
  function findAuthor(){
  throw new Error('couldn't find that author');
  }
  // synchronous
  try {
  findAuthor();
  } catch(reason) {
  // something went wrong
  }
  // async with promises
  findAuthor().catch(function(reason){
  // something went wrong
  });
  ```
  @method catch
  @param {Function} onRejection
  Useful for tooling.
  @return {Promise}
  */


  Promise.prototype.catch = function _catch(onRejection) {
    return this.then(null, onRejection);
  };

  /**
    `finally` will be invoked regardless of the promise's fate just as native
    try/catch/finally behaves
  
    Synchronous example:
  
    ```js
    findAuthor() {
      if (Math.random() > 0.5) {
        throw new Error();
      }
      return new Author();
    }
  
    try {
      return findAuthor(); // succeed or fail
    } catch(error) {
      return findOtherAuther();
    } finally {
      // always runs
      // doesn't affect the return value
    }
    ```
  
    Asynchronous example:
  
    ```js
    findAuthor().catch(function(reason){
      return findOtherAuther();
    }).finally(function(){
      // author was either found, or not
    });
    ```
  
    @method finally
    @param {Function} callback
    @return {Promise}
  */


  Promise.prototype.finally = function _finally(callback) {
    var promise = this;
    var constructor = promise.constructor;

    if (isFunction(callback)) {
      return promise.then(function (value) {
        return constructor.resolve(callback()).then(function () {
          return value;
        });
      }, function (reason) {
        return constructor.resolve(callback()).then(function () {
          throw reason;
        });
      });
    }

    return promise.then(callback, callback);
  };

  return Promise;
}();

Promise$1.prototype.then = then;
Promise$1.all = all;
Promise$1.race = race;
Promise$1.resolve = resolve$1;
Promise$1.reject = reject$1;
Promise$1._setScheduler = setScheduler;
Promise$1._setAsap = setAsap;
Promise$1._asap = asap;

/*global self*/
function polyfill() {
  var local = void 0;

  if (typeof __webpack_require__.g !== 'undefined') {
    local = __webpack_require__.g;
  } else if (typeof self !== 'undefined') {
    local = self;
  } else {
    try {
      local = Function('return this')();
    } catch (e) {
      throw new Error('polyfill failed because global object is unavailable in this environment');
    }
  }

  var P = local.Promise;

  if (P) {
    var promiseToString = null;
    try {
      promiseToString = Object.prototype.toString.call(P.resolve());
    } catch (e) {
      // silently ignored
    }

    if (promiseToString === '[object Promise]' && !P.cast) {
      return;
    }
  }

  local.Promise = Promise$1;
}

// Strange compat..
Promise$1.polyfill = polyfill;
Promise$1.Promise = Promise$1;

return Promise$1;

})));



//# sourceMappingURL=es6-promise.map


/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		if (!(moduleId in __webpack_modules__)) {
/******/ 			delete __webpack_module_cache__[moduleId];
/******/ 			var e = new Error("Cannot find module '" + moduleId + "'");
/******/ 			e.code = 'MODULE_NOT_FOUND';
/******/ 			throw e;
/******/ 		}
/******/ 		__webpack_modules__[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/compat get default export */
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function() { return module['default']; } :
/******/ 			function() { return module; };
/******/ 		__webpack_require__.d(getter, { a: getter });
/******/ 		return getter;
/******/ 	};
/******/ 	
/******/ 	/* webpack/runtime/define property getters */
/******/ 	// define getter/value functions for harmony exports
/******/ 	__webpack_require__.d = function(exports, definition) {
/******/ 		for(var key in definition) {
/******/ 			if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 				Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 			}
/******/ 		}
/******/ 	};
/******/ 	
/******/ 	/* webpack/runtime/global */
/******/ 	__webpack_require__.g = (function() {
/******/ 		if (typeof globalThis === 'object') return globalThis;
/******/ 		try {
/******/ 			return this || new Function('return this')();
/******/ 		} catch (e) {
/******/ 			if (typeof window === 'object') return window;
/******/ 		}
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	__webpack_require__.o = function(obj, prop) { return Object.prototype.hasOwnProperty.call(obj, prop); };
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	// define __esModule on exports
/******/ 	__webpack_require__.r = function(exports) {
/******/ 		if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 			Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 		}
/******/ 		Object.defineProperty(exports, '__esModule', { value: true });
/******/ 	};
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry needs to be wrapped in an IIFE because it needs to be in strict mode.
!function() {
"use strict";
/*!**********************************!*\
  !*** ./src/taskpane/taskpane.js ***!
  \**********************************/
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _polyfills_fetch__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../polyfills/fetch */ "./src/polyfills/fetch.js");
/* harmony import */ var _polyfills_fetch__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_polyfills_fetch__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _config__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./config */ "./src/taskpane/config.js");
/* provided dependency */ var Promise = __webpack_require__(/*! es6-promise */ "./node_modules/es6-promise/dist/es6-promise.js").Promise;
function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
function ownKeys(e, r) { var t = Object.keys(e); if (Object.getOwnPropertySymbols) { var o = Object.getOwnPropertySymbols(e); r && (o = o.filter(function (r) { return Object.getOwnPropertyDescriptor(e, r).enumerable; })), t.push.apply(t, o); } return t; }
function _objectSpread(e) { for (var r = 1; r < arguments.length; r++) { var t = null != arguments[r] ? arguments[r] : {}; r % 2 ? ownKeys(Object(t), !0).forEach(function (r) { _defineProperty(e, r, t[r]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function (r) { Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r)); }); } return e; }
function _defineProperty(e, r, t) { return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: !0, configurable: !0, writable: !0 }) : e[r] = t, e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == _typeof(i) ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != _typeof(t) || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != _typeof(i)) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
function _regenerator() { /*! regenerator-runtime -- Copyright (c) 2014-present, Facebook, Inc. -- license (MIT): https://github.com/babel/babel/blob/main/packages/babel-helpers/LICENSE */ var e, t, r = "function" == typeof Symbol ? Symbol : {}, n = r.iterator || "@@iterator", o = r.toStringTag || "@@toStringTag"; function i(r, n, o, i) { var c = n && n.prototype instanceof Generator ? n : Generator, u = Object.create(c.prototype); return _regeneratorDefine2(u, "_invoke", function (r, n, o) { var i, c, u, f = 0, p = o || [], y = !1, G = { p: 0, n: 0, v: e, a: d, f: d.bind(e, 4), d: function d(t, r) { return i = t, c = 0, u = e, G.n = r, a; } }; function d(r, n) { for (c = r, u = n, t = 0; !y && f && !o && t < p.length; t++) { var o, i = p[t], d = G.p, l = i[2]; r > 3 ? (o = l === n) && (u = i[(c = i[4]) ? 5 : (c = 3, 3)], i[4] = i[5] = e) : i[0] <= d && ((o = r < 2 && d < i[1]) ? (c = 0, G.v = n, G.n = i[1]) : d < l && (o = r < 3 || i[0] > n || n > l) && (i[4] = r, i[5] = n, G.n = l, c = 0)); } if (o || r > 1) return a; throw y = !0, n; } return function (o, p, l) { if (f > 1) throw TypeError("Generator is already running"); for (y && 1 === p && d(p, l), c = p, u = l; (t = c < 2 ? e : u) || !y;) { i || (c ? c < 3 ? (c > 1 && (G.n = -1), d(c, u)) : G.n = u : G.v = u); try { if (f = 2, i) { if (c || (o = "next"), t = i[o]) { if (!(t = t.call(i, u))) throw TypeError("iterator result is not an object"); if (!t.done) return t; u = t.value, c < 2 && (c = 0); } else 1 === c && (t = i.return) && t.call(i), c < 2 && (u = TypeError("The iterator does not provide a '" + o + "' method"), c = 1); i = e; } else if ((t = (y = G.n < 0) ? u : r.call(n, G)) !== a) break; } catch (t) { i = e, c = 1, u = t; } finally { f = 1; } } return { value: t, done: y }; }; }(r, o, i), !0), u; } var a = {}; function Generator() {} function GeneratorFunction() {} function GeneratorFunctionPrototype() {} t = Object.getPrototypeOf; var c = [][n] ? t(t([][n]())) : (_regeneratorDefine2(t = {}, n, function () { return this; }), t), u = GeneratorFunctionPrototype.prototype = Generator.prototype = Object.create(c); function f(e) { return Object.setPrototypeOf ? Object.setPrototypeOf(e, GeneratorFunctionPrototype) : (e.__proto__ = GeneratorFunctionPrototype, _regeneratorDefine2(e, o, "GeneratorFunction")), e.prototype = Object.create(u), e; } return GeneratorFunction.prototype = GeneratorFunctionPrototype, _regeneratorDefine2(u, "constructor", GeneratorFunctionPrototype), _regeneratorDefine2(GeneratorFunctionPrototype, "constructor", GeneratorFunction), GeneratorFunction.displayName = "GeneratorFunction", _regeneratorDefine2(GeneratorFunctionPrototype, o, "GeneratorFunction"), _regeneratorDefine2(u), _regeneratorDefine2(u, o, "Generator"), _regeneratorDefine2(u, n, function () { return this; }), _regeneratorDefine2(u, "toString", function () { return "[object Generator]"; }), (_regenerator = function _regenerator() { return { w: i, m: f }; })(); }
function _regeneratorDefine2(e, r, n, t) { var i = Object.defineProperty; try { i({}, "", {}); } catch (e) { i = 0; } _regeneratorDefine2 = function _regeneratorDefine(e, r, n, t) { function o(r, n) { _regeneratorDefine2(e, r, function (e) { return this._invoke(r, n, e); }); } r ? i ? i(e, r, { value: n, enumerable: !t, configurable: !t, writable: !t }) : e[r] = n : (o("next", 0), o("throw", 1), o("return", 2)); }, _regeneratorDefine2(e, r, n, t); }
function asyncGeneratorStep(n, t, e, r, o, a, c) { try { var i = n[a](c), u = i.value; } catch (n) { return void e(n); } i.done ? t(u) : Promise.resolve(u).then(r, o); }
function _asyncToGenerator(n) { return function () { var t = this, e = arguments; return new Promise(function (r, o) { var a = n.apply(t, e); function _next(n) { asyncGeneratorStep(a, r, o, _next, _throw, "next", n); } function _throw(n) { asyncGeneratorStep(a, r, o, _next, _throw, "throw", n); } _next(void 0); }); }; }
/* global Office document sessionStorage console window navigator XMLHttpRequest self */

;

function nativeFetch() {
  if (typeof window !== "undefined" && typeof window.fetch === "function") {
    return window.fetch.bind(window);
  }
  if (typeof self !== "undefined" && typeof self.fetch === "function") {
    return self.fetch.bind(self);
  }
  return null;
}
function httpFetch(url, options) {
  var impl = nativeFetch();
  if (impl) {
    return impl(url, options);
  }
  var opts = options || {};
  return new Promise(function (resolve, reject) {
    var xhr = new XMLHttpRequest();
    xhr.open((opts.method || "GET").toUpperCase(), url, true);
    var headers = opts.headers || {};
    Object.keys(headers).forEach(function (key) {
      xhr.setRequestHeader(key, headers[key]);
    });
    xhr.onload = function () {
      var body = xhr.responseText;
      resolve({
        ok: xhr.status >= 200 && xhr.status < 300,
        status: xhr.status,
        json: function json() {
          try {
            return Promise.resolve(JSON.parse(body || "null"));
          } catch (error) {
            return Promise.reject(error);
          }
        },
        text: function text() {
          return Promise.resolve(body);
        }
      });
    };
    xhr.onerror = function () {
      reject(new TypeError("Failed to fetch"));
    };
    xhr.send(opts.body || null);
  });
}
var AUTH_STORAGE_KEY = "feedecho-addin-auth";
var INVALID_CREDENTIALS_MESSAGE = "Invalid email or password";
var authState = {
  token: null,
  teacherId: null,
  teacherName: null
};
var sessionState = {
  id: null,
  sessionCode: null,
  sessionName: null
};
function teacherNameFromUser(user) {
  if (!user) {
    return "";
  }
  var fromParts = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  return user.displayName || fromParts || user.email || "Teacher";
}
function canAccessTeacherPortal(user) {
  var roles = Array.isArray(user === null || user === void 0 ? void 0 : user.roles) ? user.roles : [];
  return roles.includes("teacher") || roles.includes("admin") || (user === null || user === void 0 ? void 0 : user.role) === "teacher" || (user === null || user === void 0 ? void 0 : user.role) === "admin";
}
function persistAuth(nextState) {
  authState = nextState;
  try {
    if (nextState !== null && nextState !== void 0 && nextState.token) {
      sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(nextState));
    } else {
      sessionStorage.removeItem(AUTH_STORAGE_KEY);
    }
  } catch (error) {
    console.warn("Could not persist add-in auth session", error);
  }
}
function loadPersistedAuth() {
  try {
    var raw = sessionStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    var parsed = JSON.parse(raw);
    if (parsed !== null && parsed !== void 0 && parsed.token && parsed !== null && parsed !== void 0 && parsed.teacherId) {
      authState = parsed;
      return parsed;
    }
  } catch (error) {
    console.warn("Could not restore add-in auth session", error);
  }
  return null;
}
function clearAuth() {
  persistAuth({
    token: null,
    teacherId: null,
    teacherName: null
  });
  sessionState = {
    id: null,
    sessionCode: null,
    sessionName: null
  };
}
function apiUrl(path) {
  var host = window.location.hostname;
  if (host === "localhost" || host === "127.0.0.1") {
    console.log("[FeedEcho] Using webpack /api proxy for", path);
    return path;
  }
  try {
    var backend = new URL(_config__WEBPACK_IMPORTED_MODULE_1__.BACKEND_URL);
    if (window.location.protocol === "https:" && backend.protocol === "http:") {
      return path;
    }
  } catch (error) {
    return path;
  }
  return "".concat(_config__WEBPACK_IMPORTED_MODULE_1__.BACKEND_URL).concat(path);
}
function formatLoginDebugError(error, step) {
  var origin = typeof window !== "undefined" ? window.location.origin : "";
  if (!error) {
    return "Login failed at ".concat(step || "unknown step", " (no error object). Origin: ").concat(origin);
  }
  var name = error.name || "Error";
  var message = error.message || String(error);
  var status = error.status != null ? " status=".concat(error.status) : "";
  var details = error.details ? " details=".concat(error.details) : "";
  var looksLikeCors = name === "TypeError" || /failed to fetch|networkerror|cors|load failed/i.test(message);
  var corsHint = looksLikeCors ? " Possible CORS/network block: request from ".concat(origin, " may not be allowed by the API.") : "";
  return "[".concat(step, "] ").concat(name, ": ").concat(message).concat(status).concat(details, ".").concat(corsHint);
}
function authHeaders() {
  var headers = {
    "Content-Type": "application/json"
  };
  if (authState.token) {
    headers.Authorization = "Bearer ".concat(authState.token);
  }
  if (authState.teacherId) {
    headers["X-User-ID"] = authState.teacherId;
  }
  return headers;
}
function readJsonSafe(_x) {
  return _readJsonSafe.apply(this, arguments);
}
function _readJsonSafe() {
  _readJsonSafe = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee8(response) {
    var _t7;
    return _regenerator().w(function (_context8) {
      while (1) switch (_context8.p = _context8.n) {
        case 0:
          _context8.p = 0;
          _context8.n = 1;
          return response.json();
        case 1:
          return _context8.a(2, _context8.v);
        case 2:
          _context8.p = 2;
          _t7 = _context8.v;
          return _context8.a(2, null);
      }
    }, _callee8, null, [[0, 2]]);
  }));
  return _readJsonSafe.apply(this, arguments);
}
function isInvalidCredentialError(codeOrMessage) {
  var value = String(codeOrMessage || "").toUpperCase();
  return value.includes("INVALID_PASSWORD") || value.includes("EMAIL_NOT_FOUND") || value.includes("INVALID_LOGIN_CREDENTIALS") || value.includes("INVALID_EMAIL") || value.includes("INVALID CREDENTIAL") || value.includes("USER-NOT-FOUND") || value.includes("WRONG-PASSWORD");
}
function signInWithEmailPassword(_x2, _x3) {
  return _signInWithEmailPassword.apply(this, arguments);
}
function _signInWithEmailPassword() {
  _signInWithEmailPassword = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee9(email, password) {
    var url, response, data, _data$error, firebaseMessage, error;
    return _regenerator().w(function (_context9) {
      while (1) switch (_context9.n) {
        case 0:
          url = "https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=".concat(encodeURIComponent(_config__WEBPACK_IMPORTED_MODULE_1__.FIREBASE_WEB_API_KEY));
          console.log("[FeedEcho] Attempting Firebase auth...", {
            apiKeyPresent: Boolean(_config__WEBPACK_IMPORTED_MODULE_1__.FIREBASE_WEB_API_KEY),
            apiKeyPrefix: String(_config__WEBPACK_IMPORTED_MODULE_1__.FIREBASE_WEB_API_KEY || "").slice(0, 8),
            email: email
          });
          _context9.n = 1;
          return httpFetch(url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              email: email,
              password: password,
              returnSecureToken: true
            })
          });
        case 1:
          response = _context9.v;
          _context9.n = 2;
          return readJsonSafe(response);
        case 2:
          data = _context9.v;
          console.log("[FeedEcho] Firebase auth HTTP status", response.status, data);
          if (!(!response.ok || !(data !== null && data !== void 0 && data.idToken))) {
            _context9.n = 3;
            break;
          }
          firebaseMessage = (data === null || data === void 0 || (_data$error = data.error) === null || _data$error === void 0 ? void 0 : _data$error.message) || (data === null || data === void 0 ? void 0 : data.error) || "";
          error = new Error(firebaseMessage ? "Firebase auth failed: ".concat(firebaseMessage) : "Firebase auth failed (HTTP ".concat(response.status, ")"));
          error.status = response.status;
          error.details = JSON.stringify(data);
          throw error;
        case 3:
          console.log("[FeedEcho] Firebase auth succeeded, got idToken");
          return _context9.a(2, data);
      }
    }, _callee9);
  }));
  return _signInWithEmailPassword.apply(this, arguments);
}
function loginWithBackend(_x4) {
  return _loginWithBackend.apply(this, arguments);
}
function _loginWithBackend() {
  _loginWithBackend = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee0(idToken) {
    var _data$data, _data$data2;
    var url, response, data, backendMessage, error, user;
    return _regenerator().w(function (_context0) {
      while (1) switch (_context0.n) {
        case 0:
          url = apiUrl("/api/auth/login");
          console.log("[FeedEcho] Calling backend /api/auth/login...", url);
          _context0.n = 1;
          return httpFetch(url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              idToken: idToken
            })
          });
        case 1:
          response = _context0.v;
          _context0.n = 2;
          return readJsonSafe(response);
        case 2:
          data = _context0.v;
          console.log("[FeedEcho] Backend login HTTP status", response.status, data);
          if (response.ok) {
            _context0.n = 3;
            break;
          }
          backendMessage = (data === null || data === void 0 ? void 0 : data.error) || (data === null || data === void 0 ? void 0 : data.message) || "";
          error = new Error(backendMessage ? "Backend login failed: ".concat(backendMessage) : "Backend login failed (HTTP ".concat(response.status, ")"));
          error.status = response.status;
          error.details = JSON.stringify(data);
          throw error;
        case 3:
          user = (data === null || data === void 0 ? void 0 : data.user) || (data === null || data === void 0 || (_data$data = data.data) === null || _data$data === void 0 ? void 0 : _data$data.user) || null;
          console.log("[FeedEcho] Backend login succeeded", {
            hasUser: Boolean(user),
            keys: data ? Object.keys(data) : []
          });
          return _context0.a(2, _objectSpread(_objectSpread({}, data), {}, {
            user: user,
            token: (data === null || data === void 0 ? void 0 : data.token) || (data === null || data === void 0 || (_data$data2 = data.data) === null || _data$data2 === void 0 ? void 0 : _data$data2.token) || idToken
          }));
      }
    }, _callee0);
  }));
  return _loginWithBackend.apply(this, arguments);
}
function sessionCodeFromPayload(payload) {
  if (!payload) {
    return "";
  }
  return String(payload.sessionCode || payload.accessCode || payload.joinCode || "").trim().toUpperCase();
}
function isActiveSessionPayload(payload) {
  if (!payload) {
    return false;
  }
  var status = String(payload.status || "active").toLowerCase();
  return status === "active" && Boolean(sessionCodeFromPayload(payload));
}
function fetchActiveSession(_x5) {
  return _fetchActiveSession.apply(this, arguments);
}
function _fetchActiveSession() {
  _fetchActiveSession = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee1(teacherId) {
    var url, response, data;
    return _regenerator().w(function (_context1) {
      while (1) switch (_context1.n) {
        case 0:
          url = "".concat(apiUrl("/api/sessions/active"), "?teacherId=").concat(encodeURIComponent(teacherId));
          _context1.n = 1;
          return httpFetch(url, {
            method: "GET",
            headers: authHeaders()
          });
        case 1:
          response = _context1.v;
          _context1.n = 2;
          return readJsonSafe(response);
        case 2:
          data = _context1.v;
          if (!(!response.ok || (data === null || data === void 0 ? void 0 : data.success) === false)) {
            _context1.n = 3;
            break;
          }
          throw new Error((data === null || data === void 0 ? void 0 : data.error) || "Could not check for an active session.");
        case 3:
          return _context1.a(2, (data === null || data === void 0 ? void 0 : data.data) || null);
      }
    }, _callee1);
  }));
  return _fetchActiveSession.apply(this, arguments);
}
function createSession(_x6, _x7) {
  return _createSession.apply(this, arguments);
}
function _createSession() {
  _createSession = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee10(teacherId, sessionName) {
    var response, data;
    return _regenerator().w(function (_context10) {
      while (1) switch (_context10.n) {
        case 0:
          _context10.n = 1;
          return httpFetch(apiUrl("/api/sessions/create"), {
            method: "POST",
            headers: authHeaders(),
            body: JSON.stringify({
              sessionName: sessionName,
              teacherId: teacherId
            })
          });
        case 1:
          response = _context10.v;
          _context10.n = 2;
          return readJsonSafe(response);
        case 2:
          data = _context10.v;
          if (!(!response.ok || !(data !== null && data !== void 0 && data.success) || !(data !== null && data !== void 0 && data.data))) {
            _context10.n = 3;
            break;
          }
          throw new Error((data === null || data === void 0 ? void 0 : data.error) || "Failed to create session.");
        case 3:
          return _context10.a(2, data.data);
      }
    }, _callee10);
  }));
  return _createSession.apply(this, arguments);
}
function copyToClipboard(_x8) {
  return _copyToClipboard.apply(this, arguments);
}
function _copyToClipboard() {
  _copyToClipboard = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee11(text) {
    var value, textarea, copied, _navigator$clipboard, _t8, _t9;
    return _regenerator().w(function (_context11) {
      while (1) switch (_context11.p = _context11.n) {
        case 0:
          value = String(text || "").trim();
          if (value) {
            _context11.n = 1;
            break;
          }
          return _context11.a(2, false);
        case 1:
          _context11.p = 1;
          textarea = document.createElement("textarea");
          textarea.value = value;
          textarea.setAttribute("readonly", "");
          textarea.style.position = "fixed";
          textarea.style.top = "0";
          textarea.style.left = "0";
          textarea.style.opacity = "0";
          textarea.style.pointerEvents = "none";
          document.body.appendChild(textarea);
          textarea.focus();
          textarea.select();
          textarea.setSelectionRange(0, value.length);
          copied = document.execCommand("copy");
          document.body.removeChild(textarea);
          if (!copied) {
            _context11.n = 2;
            break;
          }
          return _context11.a(2, true);
        case 2:
          _context11.n = 4;
          break;
        case 3:
          _context11.p = 3;
          _t8 = _context11.v;
        case 4:
          _context11.p = 4;
          if (!((_navigator$clipboard = navigator.clipboard) !== null && _navigator$clipboard !== void 0 && _navigator$clipboard.writeText)) {
            _context11.n = 6;
            break;
          }
          _context11.n = 5;
          return navigator.clipboard.writeText(value);
        case 5:
          return _context11.a(2, true);
        case 6:
          _context11.n = 8;
          break;
        case 7:
          _context11.p = 7;
          _t9 = _context11.v;
          return _context11.a(2, false);
        case 8:
          return _context11.a(2, false);
      }
    }, _callee11, null, [[4, 7], [1, 3]]);
  }));
  return _copyToClipboard.apply(this, arguments);
}
function normalizeQuizType(type) {
  var raw = String(type || "").trim().toLowerCase().replace(/[_/]+/g, "-");
  if (raw === "multiple choice" || raw === "multiple-choice" || raw === "mcq") {
    return "Multiple Choice";
  }
  return type || "";
}
function isReadyMultipleChoiceQuiz(quiz) {
  if (!quiz || quiz.deletedAt) {
    return false;
  }
  var status = String(quiz.status || "").toLowerCase();
  var isReady = !quiz.launched && status === "ready";
  return isReady && normalizeQuizType(quiz.type) === "Multiple Choice";
}
function questionCountForQuiz(quiz) {
  if ((quiz === null || quiz === void 0 ? void 0 : quiz.questionCount) != null && quiz.questionCount !== "") {
    return Number(quiz.questionCount) || 0;
  }
  if (Array.isArray(quiz === null || quiz === void 0 ? void 0 : quiz.questions)) {
    return quiz.questions.length;
  }
  return 0;
}
function fetchTeacherQuizzes() {
  return _fetchTeacherQuizzes.apply(this, arguments);
}
function _fetchTeacherQuizzes() {
  _fetchTeacherQuizzes = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee12() {
    var response, data;
    return _regenerator().w(function (_context12) {
      while (1) switch (_context12.n) {
        case 0:
          _context12.n = 1;
          return httpFetch(apiUrl("/api/quizzes"), {
            method: "GET",
            headers: authHeaders()
          });
        case 1:
          response = _context12.v;
          _context12.n = 2;
          return readJsonSafe(response);
        case 2:
          data = _context12.v;
          if (!(!response.ok || (data === null || data === void 0 ? void 0 : data.success) === false)) {
            _context12.n = 3;
            break;
          }
          throw new Error((data === null || data === void 0 ? void 0 : data.error) || "Could not load quizzes from your library.");
        case 3:
          return _context12.a(2, Array.isArray(data === null || data === void 0 ? void 0 : data.data) ? data.data : []);
      }
    }, _callee12);
  }));
  return _fetchTeacherQuizzes.apply(this, arguments);
}
function launchQuiz(_x9, _x0) {
  return _launchQuiz.apply(this, arguments);
}
function _launchQuiz() {
  _launchQuiz = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee13(quizId, sessionCode) {
    var now, response, data, error;
    return _regenerator().w(function (_context13) {
      while (1) switch (_context13.n) {
        case 0:
          now = new Date().toISOString();
          _context13.n = 1;
          return httpFetch(apiUrl("/api/quizzes/".concat(encodeURIComponent(quizId), "/launch")), {
            method: "POST",
            headers: authHeaders(),
            body: JSON.stringify({
              accessCode: sessionCode,
              endTime: null,
              quizAvailabilityMinutes: null,
              timePerStudentMinutes: null,
              shuffleQuestions: false,
              shuffleAnswers: false,
              showFinalScore: true,
              oneAttempt: false,
              launchedAt: now
            })
          });
        case 1:
          response = _context13.v;
          _context13.n = 2;
          return readJsonSafe(response);
        case 2:
          data = _context13.v;
          if (!(!response.ok || !(data !== null && data !== void 0 && data.success))) {
            _context13.n = 3;
            break;
          }
          error = new Error((data === null || data === void 0 ? void 0 : data.error) || "Failed to launch quiz.");
          error.status = response.status;
          throw error;
        case 3:
          return _context13.a(2, data.data);
      }
    }, _callee13);
  }));
  return _launchQuiz.apply(this, arguments);
}
function isReadyExitTicket(ticket) {
  if (!ticket) {
    return false;
  }
  var status = String(ticket.status || "").toLowerCase();
  return status === "ready" || status === "draft";
}
function fetchTeacherExitTickets() {
  return _fetchTeacherExitTickets.apply(this, arguments);
}
function _fetchTeacherExitTickets() {
  _fetchTeacherExitTickets = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee14() {
    var response, data;
    return _regenerator().w(function (_context14) {
      while (1) switch (_context14.n) {
        case 0:
          _context14.n = 1;
          return httpFetch(apiUrl("/api/exit-tickets"), {
            method: "GET",
            headers: authHeaders()
          });
        case 1:
          response = _context14.v;
          _context14.n = 2;
          return readJsonSafe(response);
        case 2:
          data = _context14.v;
          if (!(!response.ok || (data === null || data === void 0 ? void 0 : data.success) === false)) {
            _context14.n = 3;
            break;
          }
          throw new Error((data === null || data === void 0 ? void 0 : data.error) || "Could not load exit tickets from your library.");
        case 3:
          return _context14.a(2, Array.isArray(data === null || data === void 0 ? void 0 : data.data) ? data.data : []);
      }
    }, _callee14);
  }));
  return _fetchTeacherExitTickets.apply(this, arguments);
}
function launchExitTicket(_x1) {
  return _launchExitTicket.apply(this, arguments);
}
function _launchExitTicket() {
  _launchExitTicket = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee15(ticketId) {
    var response, data, error;
    return _regenerator().w(function (_context15) {
      while (1) switch (_context15.n) {
        case 0:
          _context15.n = 1;
          return httpFetch(apiUrl("/api/exit-tickets/".concat(encodeURIComponent(ticketId), "/start")), {
            method: "POST",
            headers: authHeaders()
          });
        case 1:
          response = _context15.v;
          _context15.n = 2;
          return readJsonSafe(response);
        case 2:
          data = _context15.v;
          if (!(!response.ok || !(data !== null && data !== void 0 && data.success))) {
            _context15.n = 3;
            break;
          }
          error = new Error((data === null || data === void 0 ? void 0 : data.error) || "Failed to launch exit ticket.");
          error.status = response.status;
          throw error;
        case 3:
          return _context15.a(2, data.data);
      }
    }, _callee15);
  }));
  return _launchExitTicket.apply(this, arguments);
}
Office.onReady(function () {
  console.log("[FeedEcho] Office.onReady fired", {
    origin: window.location.origin,
    firebaseKeyPrefix: String(_config__WEBPACK_IMPORTED_MODULE_1__.FIREBASE_WEB_API_KEY || "").slice(0, 8),
    backend: _config__WEBPACK_IMPORTED_MODULE_1__.BACKEND_URL
  });
  var loginSection = document.getElementById("login-section");
  var appHeader = document.getElementById("app-header");
  var appMain = document.getElementById("app-main");
  var homeSection = document.getElementById("home-section");
  var homeCards = document.getElementById("home-cards");
  var homeQuizCard = document.getElementById("home-quiz-card");
  var homeExitTicketCard = document.getElementById("home-exit-ticket-card");
  var sessionSection = document.getElementById("session-section");
  var launchActions = document.getElementById("launch-actions");
  var loginForm = document.getElementById("login-form");
  var loginButton = document.getElementById("login-btn");
  var logoutButton = document.getElementById("logout-btn");
  var emailInput = document.getElementById("email");
  var passwordInput = document.getElementById("password");
  var loginError = document.getElementById("login-error");
  var forgotPasswordBtn = document.getElementById("forgot-password-btn");
  var googleSignInBtn = document.getElementById("google-signin-btn");
  var teacherNameEl = document.getElementById("teacher-name");
  var sessionStatus = document.getElementById("session-status");
  var sessionCreate = document.getElementById("session-create");
  var createSessionBtn = document.getElementById("create-session-btn");
  var sessionCodeWrap = document.getElementById("session-code-wrap");
  var sessionCodeEl = document.getElementById("session-code");
  var copySessionCodeBtn = document.getElementById("copy-session-code-btn");
  var sessionError = document.getElementById("session-error");
  var launchMcqBtn = document.getElementById("launch-mcq-btn");
  var launchExitTicketBtn = document.getElementById("launch-exit-ticket-btn");
  var launchSuccess = document.getElementById("launch-success");
  var launchError = document.getElementById("launch-error");
  var quizPicker = document.getElementById("quiz-picker");
  var quizPickerTitle = document.getElementById("quiz-picker-title");
  var quizPickerStatus = document.getElementById("quiz-picker-status");
  var quizList = document.getElementById("quiz-list");
  var confirmLaunchQuizBtn = document.getElementById("confirm-launch-quiz-btn");
  var cancelQuizPickerBtn = document.getElementById("cancel-quiz-picker-btn");
  var quizPickerError = document.getElementById("quiz-picker-error");
  if (!loginSection || !homeSection || !homeCards || !homeQuizCard || !homeExitTicketCard || !sessionSection || !launchActions || !loginForm || !loginButton || !logoutButton || !emailInput || !passwordInput || !loginError || !forgotPasswordBtn || !googleSignInBtn || !teacherNameEl || !sessionStatus || !sessionCreate || !createSessionBtn || !sessionCodeWrap || !sessionCodeEl || !copySessionCodeBtn || !sessionError || !launchMcqBtn || !launchExitTicketBtn || !launchSuccess || !launchError || !quizPicker || !quizPickerTitle || !quizPickerStatus || !quizList || !confirmLaunchQuizBtn || !cancelQuizPickerBtn || !quizPickerError) {
    var missing = [["login-section", loginSection], ["home-section", homeSection], ["home-cards", homeCards], ["home-quiz-card", homeQuizCard], ["home-exit-ticket-card", homeExitTicketCard], ["login-form", loginForm], ["login-btn", loginButton], ["login-error", loginError]].filter(function (item) {
      return !item[1];
    }).map(function (item) {
      return item[0];
    });
    console.error("[FeedEcho] Missing required DOM nodes; some handlers may not bind", missing);
    if (loginError) {
      loginError.hidden = false;
      loginError.textContent = "Add-in init error: missing elements ".concat(missing.join(", ") || "(see console)");
    }
  }
  var selectedActivityId = null;
  var pickerKind = null;
  var activityLaunched = false;
  var homeIntent = null;
  var applyLaunchIntent = function applyLaunchIntent() {
    if (!launchMcqBtn || !launchExitTicketBtn) {
      return;
    }
    launchMcqBtn.hidden = homeIntent !== "quiz";
    launchExitTicketBtn.hidden = homeIntent !== "exitTicket";
  };
  var showError = function showError(message) {
    console.log("[FeedEcho] showError", message);
    if (!loginError) {
      console.error("[FeedEcho] login-error element missing; cannot show:", message);
      return;
    }
    loginError.textContent = message || "";
    loginError.hidden = !message;
  };
  var showSessionError = function showSessionError(message) {
    sessionError.textContent = message;
    sessionError.hidden = !message;
  };
  var showLaunchMessage = function showLaunchMessage(message) {
    var isError = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
    if (isError) {
      launchError.textContent = message;
      launchError.hidden = !message;
      if (message) {
        launchSuccess.hidden = true;
        launchSuccess.textContent = "";
      }
      return;
    }
    launchSuccess.textContent = message;
    launchSuccess.hidden = !message;
    if (message) {
      launchError.hidden = true;
      launchError.textContent = "";
    }
  };
  var setLaunchButtonsEnabled = function setLaunchButtonsEnabled(enabled) {
    launchMcqBtn.disabled = !enabled;
    launchExitTicketBtn.disabled = !enabled;
  };
  var hideQuizPicker = function hideQuizPicker() {
    selectedActivityId = null;
    pickerKind = null;
    quizList.replaceChildren();
    quizPicker.hidden = true;
    quizPickerTitle.textContent = "Select an activity";
    quizPickerStatus.textContent = "";
    quizPickerError.hidden = true;
    quizPickerError.textContent = "";
    confirmLaunchQuizBtn.disabled = true;
    confirmLaunchQuizBtn.textContent = "Launch selected";
  };
  var showLaunchButtons = function showLaunchButtons(visible) {
    applyLaunchIntent();
    launchActions.hidden = !visible;
    if (!visible) {
      hideQuizPicker();
      showLaunchMessage("");
      showLaunchMessage("", true);
      setLaunchButtonsEnabled(true);
      activityLaunched = false;
    }
  };
  var showCreateSession = function showCreateSession(visible) {
    sessionCreate.hidden = !visible;
  };
  var displaySessionCode = function displaySessionCode(payload) {
    var code = sessionCodeFromPayload(payload);
    sessionState = {
      id: payload.id || payload.sessionId || null,
      sessionCode: code,
      sessionName: payload.sessionName || null
    };
    sessionCodeEl.textContent = code;
    sessionCodeWrap.hidden = false;
    showCreateSession(false);
    sessionStatus.textContent = payload.sessionName ? "Active session: ".concat(payload.sessionName) : "Active session";
    activityLaunched = false;
    showLaunchButtons(Boolean(code));
    setLaunchButtonsEnabled(Boolean(code));
    showLaunchMessage("");
    showLaunchMessage("", true);
  };
  var resetSessionUi = function resetSessionUi() {
    sessionState = {
      id: null,
      sessionCode: null,
      sessionName: null
    };
    sessionCodeEl.textContent = "";
    sessionCodeWrap.hidden = true;
    showCreateSession(false);
    sessionStatus.textContent = "";
    showSessionError("");
    showLaunchButtons(false);
  };
  var showQuizPickerError = function showQuizPickerError(message) {
    quizPickerError.textContent = message;
    quizPickerError.hidden = !message;
  };
  var renderActivityList = function renderActivityList(items, _ref) {
    var titleFallback = _ref.titleFallback,
      showQuestionCount = _ref.showQuestionCount;
    quizList.replaceChildren();
    selectedActivityId = null;
    confirmLaunchQuizBtn.disabled = true;
    items.forEach(function (item) {
      var row = document.createElement("button");
      row.type = "button";
      row.className = "quiz-item";
      row.setAttribute("role", "option");
      row.dataset.activityId = item.id;
      var title = document.createElement("span");
      title.className = "quiz-item-title";
      title.textContent = item.title || titleFallback;
      row.append(title);
      if (showQuestionCount) {
        var count = questionCountForQuiz(item);
        var meta = document.createElement("span");
        meta.className = "quiz-item-meta";
        meta.textContent = "".concat(count, " question").concat(count === 1 ? "" : "s");
        row.append(meta);
      }
      row.addEventListener("click", function () {
        selectedActivityId = item.id;
        quizList.querySelectorAll(".quiz-item").forEach(function (el) {
          return el.classList.remove("is-selected");
        });
        row.classList.add("is-selected");
        confirmLaunchQuizBtn.disabled = activityLaunched;
        showQuizPickerError("");
      });
      quizList.appendChild(row);
    });
  };
  var openQuizPicker = /*#__PURE__*/function () {
    var _openQuizPicker = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee() {
      var quizzes, _t;
      return _regenerator().w(function (_context) {
        while (1) switch (_context.p = _context.n) {
          case 0:
            if (sessionState.sessionCode) {
              _context.n = 1;
              break;
            }
            showLaunchMessage("Create a session before launching a quiz.", true);
            return _context.a(2);
          case 1:
            if (!activityLaunched) {
              _context.n = 2;
              break;
            }
            return _context.a(2);
          case 2:
            pickerKind = "quiz";
            showLaunchMessage("");
            showLaunchMessage("", true);
            quizPicker.hidden = false;
            quizPickerTitle.textContent = "Select an MCQ quiz";
            quizList.replaceChildren();
            selectedActivityId = null;
            confirmLaunchQuizBtn.disabled = true;
            confirmLaunchQuizBtn.textContent = "Launch selected quiz";
            quizPickerStatus.textContent = "Loading quizzes…";
            showQuizPickerError("");
            launchMcqBtn.disabled = true;
            _context.p = 3;
            _context.n = 4;
            return fetchTeacherQuizzes();
          case 4:
            quizzes = _context.v.filter(isReadyMultipleChoiceQuiz);
            if (!(quizzes.length === 0)) {
              _context.n = 5;
              break;
            }
            quizPickerStatus.textContent = "No ready multiple-choice quizzes in your library.";
            return _context.a(2);
          case 5:
            quizPickerStatus.textContent = "Choose a quiz, then confirm to launch it in this session.";
            renderActivityList(quizzes, {
              titleFallback: "Untitled Quiz",
              showQuestionCount: true
            });
            _context.n = 7;
            break;
          case 6:
            _context.p = 6;
            _t = _context.v;
            quizPickerStatus.textContent = "Could not load quizzes.";
            showQuizPickerError((_t === null || _t === void 0 ? void 0 : _t.message) || "Could not load quizzes from your library.");
          case 7:
            _context.p = 7;
            if (!activityLaunched) {
              launchMcqBtn.disabled = false;
            }
            return _context.f(7);
          case 8:
            return _context.a(2);
        }
      }, _callee, null, [[3, 6, 7, 8]]);
    }));
    function openQuizPicker() {
      return _openQuizPicker.apply(this, arguments);
    }
    return openQuizPicker;
  }();
  var openExitTicketPicker = /*#__PURE__*/function () {
    var _openExitTicketPicker = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee2() {
      var tickets, _t2;
      return _regenerator().w(function (_context2) {
        while (1) switch (_context2.p = _context2.n) {
          case 0:
            if (sessionState.sessionCode) {
              _context2.n = 1;
              break;
            }
            showLaunchMessage("Create a session before launching an exit ticket.", true);
            return _context2.a(2);
          case 1:
            if (!activityLaunched) {
              _context2.n = 2;
              break;
            }
            return _context2.a(2);
          case 2:
            pickerKind = "exitTicket";
            showLaunchMessage("");
            showLaunchMessage("", true);
            quizPicker.hidden = false;
            quizPickerTitle.textContent = "Select an exit ticket";
            quizList.replaceChildren();
            selectedActivityId = null;
            confirmLaunchQuizBtn.disabled = true;
            confirmLaunchQuizBtn.textContent = "Launch selected exit ticket";
            quizPickerStatus.textContent = "Loading exit tickets…";
            showQuizPickerError("");
            launchExitTicketBtn.disabled = true;
            _context2.p = 3;
            _context2.n = 4;
            return fetchTeacherExitTickets();
          case 4:
            tickets = _context2.v.filter(isReadyExitTicket);
            if (!(tickets.length === 0)) {
              _context2.n = 5;
              break;
            }
            quizPickerStatus.textContent = "No ready exit tickets in your library.";
            return _context2.a(2);
          case 5:
            quizPickerStatus.textContent = "Choose an exit ticket, then confirm to launch it in this session.";
            renderActivityList(tickets, {
              titleFallback: "Untitled Exit Ticket",
              showQuestionCount: false
            });
            _context2.n = 7;
            break;
          case 6:
            _context2.p = 6;
            _t2 = _context2.v;
            quizPickerStatus.textContent = "Could not load exit tickets.";
            showQuizPickerError((_t2 === null || _t2 === void 0 ? void 0 : _t2.message) || "Could not load exit tickets from your library.");
          case 7:
            _context2.p = 7;
            if (!activityLaunched) {
              launchExitTicketBtn.disabled = false;
            }
            return _context2.f(7);
          case 8:
            return _context2.a(2);
        }
      }, _callee2, null, [[3, 6, 7, 8]]);
    }));
    function openExitTicketPicker() {
      return _openExitTicketPicker.apply(this, arguments);
    }
    return openExitTicketPicker;
  }();
  var loadActiveSession = /*#__PURE__*/function () {
    var _loadActiveSession = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee3() {
      var active, _t3;
      return _regenerator().w(function (_context3) {
        while (1) switch (_context3.p = _context3.n) {
          case 0:
            resetSessionUi();
            sessionSection.hidden = false;
            sessionStatus.textContent = "Checking for an active session…";
            if (authState.teacherId) {
              _context3.n = 1;
              break;
            }
            sessionStatus.textContent = "No active session";
            showCreateSession(true);
            return _context3.a(2);
          case 1:
            _context3.p = 1;
            _context3.n = 2;
            return fetchActiveSession(authState.teacherId);
          case 2:
            active = _context3.v;
            if (!isActiveSessionPayload(active)) {
              _context3.n = 3;
              break;
            }
            displaySessionCode(active);
            return _context3.a(2);
          case 3:
            sessionStatus.textContent = "No active session. Create one to launch activities.";
            showCreateSession(true);
            _context3.n = 5;
            break;
          case 4:
            _context3.p = 4;
            _t3 = _context3.v;
            sessionStatus.textContent = "Could not load session.";
            showSessionError((_t3 === null || _t3 === void 0 ? void 0 : _t3.message) || "Could not check for an active session.");
            showCreateSession(true);
          case 5:
            return _context3.a(2);
        }
      }, _callee3, null, [[1, 4]]);
    }));
    function loadActiveSession() {
      return _loadActiveSession.apply(this, arguments);
    }
    return loadActiveSession;
  }();
  var showLoggedIn = function showLoggedIn(teacherName) {
    console.log("[FeedEcho] Switching to home view", teacherName);
    if (teacherNameEl) {
      teacherNameEl.textContent = teacherName || "Teacher";
    }
    if (loginSection) {
      loginSection.hidden = true;
    }
    if (appHeader) {
      appHeader.hidden = false;
    }
    if (appMain) {
      appMain.hidden = false;
    }
    if (!homeSection) {
      showError("Login succeeded but the home screen is missing. Reload the add-in to pick up the latest HTML.");
      return;
    }
    homeSection.hidden = false;
    if (homeCards) {
      homeCards.hidden = false;
    }
    homeIntent = null;
    applyLaunchIntent();
    if (sessionSection) {
      sessionSection.hidden = true;
    }
    showLaunchButtons(false);
    showError("");
  };
  var showLoggedOut = function showLoggedOut() {
    if (loginSection) {
      loginSection.hidden = false;
    }
    if (appHeader) {
      appHeader.hidden = true;
    }
    if (appMain) {
      appMain.hidden = true;
    }
    if (homeSection) {
      homeSection.hidden = true;
    }
    if (homeCards) {
      homeCards.hidden = true;
    }
    homeIntent = null;
    if (sessionSection) {
      sessionSection.hidden = true;
    }
    if (teacherNameEl) {
      teacherNameEl.textContent = "";
    }
    resetSessionUi();
  };
  var openHomeActivity = function openHomeActivity(intent) {
    homeIntent = intent;
    homeCards.hidden = true;
    applyLaunchIntent();
    loadActiveSession();
  };
  var persisted = loadPersistedAuth();
  if (persisted) {
    showLoggedIn(persisted.teacherName);
  }
  if (forgotPasswordBtn) {
    forgotPasswordBtn.addEventListener("click", function () {
      showError("Password reset is not available in the add-in yet. Please use the FeedEcho website.");
    });
  }
  if (googleSignInBtn) {
    googleSignInBtn.addEventListener("click", function () {
      // TODO: Connect Google OAuth for the PowerPoint add-in.
    });
  }
  if (homeQuizCard) {
    homeQuizCard.addEventListener("click", function () {
      openHomeActivity("quiz");
    });
  }
  if (homeExitTicketCard) {
    homeExitTicketCard.addEventListener("click", function () {
      openHomeActivity("exitTicket");
    });
  }
  if (loginForm) {
    loginForm.addEventListener("submit", /*#__PURE__*/function () {
      var _ref2 = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee4(event) {
        var email, password, firebaseAuth, loginResponse, user, teacherName, _t4;
        return _regenerator().w(function (_context4) {
          while (1) switch (_context4.p = _context4.n) {
            case 0:
              event.preventDefault();
              console.log("[FeedEcho] Login form submit");
              _context4.p = 1;
              email = emailInput ? emailInput.value.trim() : "";
              password = passwordInput ? passwordInput.value : "";
              if (!(!email || !password)) {
                _context4.n = 2;
                break;
              }
              showError("DEBUG: Email or password is empty.");
              return _context4.a(2);
            case 2:
              if (loginButton) {
                loginButton.disabled = true;
                loginButton.textContent = "Signing in…";
              }
              showError("");
              console.log("[FeedEcho] Step 1: Firebase auth starting");
              _context4.n = 3;
              return signInWithEmailPassword(email, password);
            case 3:
              firebaseAuth = _context4.v;
              console.log("[FeedEcho] Step 2: Firebase auth succeeded, got idToken");
              console.log("[FeedEcho] Step 3: Calling backend /api/auth/login...");
              _context4.n = 4;
              return loginWithBackend(firebaseAuth.idToken);
            case 4:
              loginResponse = _context4.v;
              console.log("[FeedEcho] Step 4: Backend login succeeded", loginResponse);
              user = loginResponse && loginResponse.user;
              if (user) {
                _context4.n = 5;
                break;
              }
              throw new Error("DEBUG: Backend returned no user. Response keys: ".concat(loginResponse ? Object.keys(loginResponse).join(", ") : "null"));
            case 5:
              if (canAccessTeacherPortal(user)) {
                _context4.n = 6;
                break;
              }
              throw new Error("DEBUG: Account does not have host access. roles=".concat(JSON.stringify(user.roles), " role=").concat(user.role));
            case 6:
              teacherName = teacherNameFromUser(user);
              console.log("[FeedEcho] Step 5: Persisting auth and showing home", {
                teacherName: teacherName,
                uid: user.uid
              });
              persistAuth({
                token: firebaseAuth.idToken || loginResponse.token,
                teacherId: user.uid,
                teacherName: teacherName
              });
              if (passwordInput) {
                passwordInput.value = "";
              }
              showLoggedIn(teacherName);
              _context4.n = 8;
              break;
            case 7:
              _context4.p = 7;
              _t4 = _context4.v;
              console.error("[FeedEcho] Login failed", _t4);
              try {
                clearAuth();
                showLoggedOut();
              } catch (resetError) {
                console.error("[FeedEcho] Failed while resetting after login error", resetError);
              }
              showError(formatLoginDebugError(_t4, _t4 && _t4.step ? _t4.step : "login handler"));
            case 8:
              _context4.p = 8;
              if (loginButton) {
                loginButton.disabled = false;
                loginButton.textContent = "Login";
              }
              return _context4.f(8);
            case 9:
              return _context4.a(2);
          }
        }, _callee4, null, [[1, 7, 8, 9]]);
      }));
      return function (_x10) {
        return _ref2.apply(this, arguments);
      };
    }());
  } else {
    console.error("[FeedEcho] login-form not found; Login button will do nothing");
  }
  if (loginButton) {
    loginButton.addEventListener("click", function () {
      console.log("[FeedEcho] Login button clicked");
    });
  }
  if (createSessionBtn) {
    createSessionBtn.addEventListener("click", /*#__PURE__*/_asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee5() {
      var sessionName, created, _t5;
      return _regenerator().w(function (_context5) {
        while (1) switch (_context5.p = _context5.n) {
          case 0:
            if (authState.teacherId) {
              _context5.n = 1;
              break;
            }
            showSessionError("Please sign in again before creating a session.");
            return _context5.a(2);
          case 1:
            createSessionBtn.disabled = true;
            createSessionBtn.textContent = "Creating…";
            showSessionError("");
            _context5.p = 2;
            sessionName = authState.teacherName ? "".concat(authState.teacherName, "'s Session") : "FeedEcho Session";
            _context5.n = 3;
            return createSession(authState.teacherId, sessionName);
          case 3:
            created = _context5.v;
            if (sessionCodeFromPayload(created)) {
              _context5.n = 4;
              break;
            }
            throw new Error("Session was created without a code. Please try again.");
          case 4:
            displaySessionCode(created);
            _context5.n = 6;
            break;
          case 5:
            _context5.p = 5;
            _t5 = _context5.v;
            showSessionError((_t5 === null || _t5 === void 0 ? void 0 : _t5.message) || "Failed to create session.");
          case 6:
            _context5.p = 6;
            createSessionBtn.disabled = false;
            createSessionBtn.textContent = "Create Session";
            return _context5.f(6);
          case 7:
            return _context5.a(2);
        }
      }, _callee5, null, [[2, 5, 6, 7]]);
    })));
  }
  if (copySessionCodeBtn) {
    copySessionCodeBtn.addEventListener("click", /*#__PURE__*/_asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee6() {
      var code, copied, originalTitle;
      return _regenerator().w(function (_context6) {
        while (1) switch (_context6.n) {
          case 0:
            code = sessionState.sessionCode || sessionCodeEl.textContent;
            _context6.n = 1;
            return copyToClipboard(code);
          case 1:
            copied = _context6.v;
            originalTitle = "Copy session code";
            copySessionCodeBtn.title = copied ? "Copied!" : "Could not copy";
            window.setTimeout(function () {
              copySessionCodeBtn.title = originalTitle;
            }, 1500);
          case 2:
            return _context6.a(2);
        }
      }, _callee6);
    })));
  }
  if (launchMcqBtn) {
    launchMcqBtn.addEventListener("click", function () {
      openQuizPicker();
    });
  }
  if (launchExitTicketBtn) {
    launchExitTicketBtn.addEventListener("click", function () {
      openExitTicketPicker();
    });
  }
  if (cancelQuizPickerBtn) {
    cancelQuizPickerBtn.addEventListener("click", function () {
      hideQuizPicker();
    });
  }
  if (confirmLaunchQuizBtn) {
    confirmLaunchQuizBtn.addEventListener("click", /*#__PURE__*/_asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee7() {
      var launchingQuiz, message, _t6;
      return _regenerator().w(function (_context7) {
        while (1) switch (_context7.p = _context7.n) {
          case 0:
            if (!(!selectedActivityId || !pickerKind)) {
              _context7.n = 1;
              break;
            }
            showQuizPickerError("Select an item to launch.");
            return _context7.a(2);
          case 1:
            if (sessionState.sessionCode) {
              _context7.n = 2;
              break;
            }
            showQuizPickerError("Create a session before launching an activity.");
            return _context7.a(2);
          case 2:
            launchingQuiz = pickerKind === "quiz";
            confirmLaunchQuizBtn.disabled = true;
            confirmLaunchQuizBtn.textContent = "Launching…";
            showQuizPickerError("");
            _context7.p = 3;
            if (!launchingQuiz) {
              _context7.n = 5;
              break;
            }
            _context7.n = 4;
            return launchQuiz(selectedActivityId, sessionState.sessionCode);
          case 4:
            _context7.n = 6;
            break;
          case 5:
            _context7.n = 6;
            return launchExitTicket(selectedActivityId);
          case 6:
            activityLaunched = true;
            hideQuizPicker();
            setLaunchButtonsEnabled(false);
            showLaunchMessage(launchingQuiz ? "Quiz launched! Students can join with code ".concat(sessionState.sessionCode) : "Exit ticket launched! Students can join with code ".concat(sessionState.sessionCode));
            _context7.n = 8;
            break;
          case 7:
            _context7.p = 7;
            _t6 = _context7.v;
            message = (_t6 === null || _t6 === void 0 ? void 0 : _t6.message) || (launchingQuiz ? "Failed to launch quiz." : "Failed to launch exit ticket.");
            showQuizPickerError(message);
            showLaunchMessage(message, true);
            confirmLaunchQuizBtn.disabled = false;
            confirmLaunchQuizBtn.textContent = launchingQuiz ? "Launch selected quiz" : "Launch selected exit ticket";
          case 8:
            return _context7.a(2);
        }
      }, _callee7, null, [[3, 7]]);
    })));
  }
  if (logoutButton) {
    logoutButton.addEventListener("click", function () {
      clearAuth();
      showLoggedOut();
    });
  }
});
}();
/******/ })()
;
//# sourceMappingURL=taskpane.js.map