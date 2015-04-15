var utils = require('./lib/utils');
var $ = utils.$;

var _addTemplate = function(route, insertBefore) {
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

module.exports = {

  appendTemplate: function(route, insertBefore) {
    _addTemplate(route, false);
  },

  prependTemplate: function(route, insertBefore) {
    _addTemplate(route, true);
  }

};
