/*

# PermaObject

A wrapper around native JavaScript objects that get saved to a database/disk
whenever a property gets changed. Uses `Object.observe` under the hood.

## Sample usage

### Creating

#### Observable object

    var ps = new PermaObject('voxel-server');

    ps.load().then(function () {
      ps.swag = 'yolo';
      ps.icy = 'burr';
    });

#### Observable array

    var ps = new PermaObject('voxel-server', []);

    ps.load().then(function () {
      ps.push('yolo');
      ps.push('swag');
    });

### Purging

    ps.unobserve();

### Stopping observations

    ps.unobserve();

*/

var extend = require('extend');

var db = require('./db');


require('object.observe');  // Polyfill `Object.observe`.


function clone(obj) {
  if (Array.isArray(obj)) {
    return obj.map(function (x) {
      return x;
    });
  }

  var ret = {};

  Object.keys(obj).forEach(function (key) {
    if (isPrivateKey(key)) {
      return;
    }

    ret[key] = obj[key];
  });

  return ret;
}


function isPrivateKey(key) {
  return key[0] === '_';
}


function PermaObject(namespace, originalObject) {
  if (!(this instanceof PermaObject)) {
    return new PermaObject(namespace);
  }

  // A hack to observing an array: we keep the array as a member of the
  // observed object.
  if (Array.isArray(originalObject)) {
    originalObject = {array: originalObject};
  }

  this._showLogs = !!process.env.DEBUG;
  this._observed = false;
  this._namespace = namespace;
  this._originalObject = originalObject || {};
  this._onchange = this._onchange.bind(this);

  this._loaded = this._refresh();
}


PermaObject.prototype.push = function (item) {
  // This is like `this.array.push(item)` but will actually get observed.
  var self = this;
  return self._loaded.then(function () {
    self.array = (self.array || []).concat([item]);
    return item;
  });
};

PermaObject.prototype.forEach = function (func, context) {
  // This is a wrapper for `this.array.forEach`.
  var self = this;
  return self._loaded.then(function () {
    return (self.array || []).forEach(func, context);
  });
};

PermaObject.prototype.set = function (obj) {
  this.unobserve();
  extend(this, obj);
  this._observe();
};

PermaObject.prototype.toJSON = function () {
  return clone(this);
};

PermaObject.prototype._debug = function () {
  if (this._showLogs) {
    console.log.apply(console, arguments);
  }
};

PermaObject.prototype._observe = function () {
  if (this._observed) {
    return;
  }

  this._debug('observe %j', this);
  this._observed = true;
  Object.observe(this, this._onchange);
};

PermaObject.prototype._onchange = function (changes) {
  this._debug('changes', changes);
  this._save();
};

PermaObject.prototype.load = PermaObject.prototype._refresh = function () {
  var self = this;

  self._debug('refresh %j', self);

  return db.redis.get(self._namespace).then(function (reply) {
    self._debug('redis get %s', self._namespace);

    try {
      reply = JSON.parse(reply);
    } catch (e) {
      console.warn('Could not parse Redis reply as JSON: %s', reply);
    }

    var obj = reply || self._originalObject;
    self.set(obj);

    return obj;
  });
};

PermaObject.prototype.purge = function () {
  var self = this;

  self._debug('purge %j', self);
  return db.redis.remove(self._namespace).then(function (reply) {
    self._debug('redis remove %s', self._namespace);
  });
};

PermaObject.prototype._save = function () {
  var self = this;

  self._debug('save %j', self);

  var data = JSON.stringify(self.toJSON());

  return db.redis.set(self._namespace, data).then(function (reply) {
    self._debug('redis set %s %j', self._namespace, data);
  });
};

PermaObject.prototype.unobserve = function () {
  if (!this._observed) {
    return;
  }

  this._debug('unobserve %j', this);
  Object.unobserve(this, this._onchange);
  this._observed = false;
};


module.exports = PermaObject;
