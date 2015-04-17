var utils = require('./lib/utils');

var $ = utils.$;

var internals = {};


internals.addTemplate = function(route, insertBefore) {
  var template = $('template[data-route="' + route + '"]');

  // Make a copy of the document fragment so the original template doesn't
  // get destroyed in the DOM.
  var clone = document.importNode(template.content, true);

  if (insertBefore) {
    main.insertBefore(clone, main.firstChild);
  } else {
    main.appendChild(clone);
  }
};


exports.append = function(route, insertBefore) {
  internals.addTemplate(route, false);
};


exports.prepend = function(route, insertBefore) {
  internals.addTemplate(route, true);
};


exports.render = function(route) {
  main.setAttribute('data-route', route);
  main.innerHTML = $('template[data-route="' + route + '"]').innerHTML;
};
