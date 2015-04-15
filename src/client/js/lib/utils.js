exports.$ = function (sel) {
  return document.querySelector(sel);
};


exports.$$ = function (sel) {
  return Array.prototype.slice.call(document.querySelectorAll(sel));
};


exports.getCurrentPath = function (win) {
  win = win || window;
  return (win.location.pathname || '') + (win.location.search || '');
};


exports.formatUrl = function(url) {
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
