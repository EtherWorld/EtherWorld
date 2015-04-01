exports.randomString = function () {
  return (Math.random() + 1).toString(36).substring(7);
};


var toArray = exports.toArray = function (list) {
  return Array.prototype.slice.call(list);
};


exports.$ = function (sel) {
  return document.querySelector(sel);
};


exports.$$ = function (sel) {
  return toArray(document.querySelectorAll(sel));
};
