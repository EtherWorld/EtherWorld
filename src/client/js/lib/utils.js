var reRoomUrl = exports.reRoomUrl = /^[~a-z0-9_-]+$/i;


exports.reStringRoomUrl = '([~\.a-z0-9_-]+)';


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


var isRoom = exports.isRoom = function (str) {
  return reRoomUrl.test(str);
};


exports.formatLinkUrl = function(url) {
  if (isRoom(url)) {
    return url;
  }

  return (url.indexOf('://') === -1 || url.indexOf('//') === -1) ? 'http://' + url : url;
};


exports.launchFs = function(element, opts) {
  if(element.requestFullscreen) {
    element.requestFullscreen(opts);
  } else if(element.mozRequestFullScreen) {
    element.mozRequestFullScreen(opts);
  } else if(element.webkitRequestFullscreen) {
    element.webkitRequestFullscreen(opts);
  }
};


exports.requestPointerLock = function (el) {
  el = el || document;
  el.requestPointerLock = el.requestPointerLock ||
                          el.mozRequestPointerLock ||
                          el.webkitRequestPointerLock;
  el.requestPointerLock();
};


exports.exitPointerLock = function (el) {
  el = el || document;
  el.exitPointerLock = el.exitPointerLock ||
                       el.mozExitPointerLock ||
                       el.webkitExitPointerLock;
  el.exitPointerLock();
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
