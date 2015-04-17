var internals = {
  field_tags_re: /input|keygen|meter|option|output|progress|select|textarea/i
};


exports.$ = function (sel) {
  return document.querySelector(sel);
};


exports.$$ = function (sel) {
  return Array.prototype.slice.call(document.querySelectorAll(sel));
};


exports.fieldFocused = function (e) {
  return internals.field_tags_re.test(e.target.nodeName);
};


exports.getCurrentPath = function (win) {
  win = win || window;
  return (win.location.pathname || '') + (win.location.search || '');
};


exports.formatUrl = function(url) {
  return (url.indexOf('://') == -1) ? 'http://' + url : url;
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
