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


exports.getCurrentPath = function (win) {
  win = win || window;
  return (win.location.pathname || '') + (win.location.search || '');
};

exports.addhttp = function(url) {
  return (url.indexOf('://') == -1) ? 'http://' + url : url;
};

exports.debounce = function(func, wait, immediate) {
  var timeout;
  return function() {
    var context = this, args = arguments;
    var later = function() {
      timeout = null;
      if (!immediate) func.apply(context, args);
    };
    var callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (callNow) func.apply(context, args);
  };
};
