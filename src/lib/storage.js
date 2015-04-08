if (global.window) {
  var ls = require('local-storage');
} else {
  var LocalStorage = require('node-localstorage').JSONStorage;

  // Normalise the method names so they're consistent.
  LocalStorage.prototype.set = LocalStorage.prototype.setItem;
  LocalStorage.prototype.get = LocalStorage.prototype.getItem;
  LocalStorage.prototype.remove = LocalStorage.prototype.removeItem;

  ls = new LocalStorage('./db');
}


module.exports = ls;
