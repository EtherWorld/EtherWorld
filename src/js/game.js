var urllib = require('url');
var qs = require('query-string');

var extend = require('extend');
var Grapnel = require('grapnel');
var storage = require('local-storage');

var highlight = require('voxel-highlight');
var player = require('voxel-player');
var voxel = require('voxel');
var walk = require('voxel-walk');
var rescue = require('voxel-rescue');
var createClient = require('../../server/voxel-client');
var utils = require('../../lib/utils');

var game;

var $ = utils.$;


module.exports = function (opts, setup) {
  var GET = qs.parse(window.location.search);
  var router = new Grapnel({pushState: true});
  var main = $('#main');

  var renderTemplate = function (route) {
    main.innerHTML = $('template[data-route="' + route + '"]').innerHTML;
  };

  var _addTemplate = function (route, insertBefore) {
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

  var appendTemplate = function (route, insertBefore) {
    _addTemplate(route, false);
  };

  var prependTemplate = function (route, insertBefore) {
    _addTemplate(route, true);
  };

  var isValidNavigationLink = function (el) {
    var href = el.href || el.action;
    return (
      !href ||
      href[0] === '#' ||
      href.substr(0, 4) === 'http' ||
      href.substr(0, 7) === 'mailto:' ||
      href.substr(0, 11) === 'javascript:' ||  // jshint ignore:line
      href.indexOf('.gif') !== -1 ||
      href.indexOf('.png') !== -1 ||
      href.indexOf('.jpg') !== -1 ||
      el.getAttribute('target') ||
      el.getAttribute('rel') === 'external'
    );
  };

  // Hijack clicks so the SPA can handle the navigation.
  document.body.addEventListener('click', function (e) {
    if (e.target.tagName.toLowerCase() !== 'a' || e.metaKey || e.ctrlKey ||
        e.button !== 0 || !isValidNavigationLink(e.target)) {

      return;
    }
    e.preventDefault();
    e.stopPropagation();
    router.navigate(e.target.href);
  }, true);


  router.get('/', function (req) {
    console.log('[%s] Navigated to view', utils.getCurrentPath());

    renderTemplate('/room/:room?');

    var roomName = 'splash';
    console.log('[%s] room: %s', this.state.route, roomName);

    startGame();

    prependTemplate('/');
  });

  router.get('/room/:room?', function (req) {
    console.log('[%s] Navigated to view', utils.getCurrentPath());

    var roomName = req.params.room;

    if (!roomName) {
      window.history.replaceState({}, null, '/room/' + utils.randomString());
      router.trigger('navigate').trigger('divert');
      return;
    }

    console.log('[%s] room: %s', utils.getCurrentPath(), roomName);

    renderTemplate(this.state.route);

    var username = storage.get('username');
    if (!username) {
      username = prompt('Choose a username');
      storage.set('username', username);
    }

    console.log('[%s] username: %s', utils.getCurrentPath(), username);

    startGame();
  });

  function startGame() {
    // voxel game
    setup = setup || defaultSetup;
    opts = extend({}, opts || {});

    var client = createClient(opts.server);

    client.emitter.on('noMoreChunks', function() {
      console.log("Attaching to the container and creating player")

      var container = opts.containerSelector ? $(opts.containerSelector) : (opts.container || document.body);

      game = client.game;

      game.appendTo(container);

      if (game.notCapable()) return game

      var createPlayer = player(game)

      // create the player from a minecraft skin file and tell the
      // game to use it as the main player
      var avatar = createPlayer(opts.playerSkin || '/img/player.png')
      avatar.possess()
      avatar.yaw.position.set(2, 14, 4)

      setup(game, avatar, client)
    });
  }
};


function defaultSetup(game, avatar, client) {
  // highlight blocks when you look at them, hold <Ctrl> for block placement
  var blockPosPlace, blockPosErase
  var hl = game.highlighter = highlight(game, {
    color: 0xff0000,
    adjacentActive: function() {
      return currentMaterial !== 0;
    }
  })
  hl.on('highlight', function (voxelPos) { blockPosErase = voxelPos })
  hl.on('remove', function () { blockPosErase = null })
  hl.on('highlight-adjacent', function (voxelPos) { blockPosPlace = voxelPos })
  hl.on('remove-adjacent', function () { blockPosPlace = null })

  console.log(game.controls.target());

  rescue(game, {
    teleport: true,
    position: [0, 30, 0],
    dangerZone: {
      lower: { x: -Infinity, y: -Infinity, z: -Infinity },
      upper: { x: Infinity, y: -50, z: Infinity }
    }
  });

  // toggle between first and third person modes
  window.addEventListener('keydown', function (ev) {
    if (ev.keyCode === 'R'.charCodeAt(0)) avatar.toggle()
  })

  // block interaction stuff, uses highlight data
  var currentMaterial = 2

  // Set the initial toolbar state
  var initialActiveSlot = $(`#toolbar [data-slot="3"]`);
  initialActiveSlot.classList.add('active');

  game.on('fire', function() {
    var position = blockPosPlace
    if (position) {
      game.createBlock(position, currentMaterial)
      client.emitter.emit('set', position, currentMaterial)
    }
    else {
      position = blockPosErase
      if (position) {
        game.setBlock(position, 0)
        client.emitter.emit('set', position, 0)
      }
    }
  })

  game.settings.materials.forEach((primitive, idx) => {
    var slotIdx = idx + 2;
    var toolbarSlot = $(`#toolbar [data-slot="${slotIdx}"]`);
    toolbarSlot.style.backgroundColor = primitive;
  });

  window.addEventListener('keydown', e => {
    var key = String.fromCharCode(e.which);
    if (key.match(/[0-9]{1}/)) {
      console.log('change active item', key);
      var oldActiveItem = $('#toolbar .active[data-slot]');
      if (oldActiveItem) {
        oldActiveItem.classList.remove('active');
      }

      var newActiveSlot = $(`#toolbar [data-slot="${key}"]`);
      if (newActiveSlot) {
        newActiveSlot.classList.add('active');
      }

      currentMaterial = parseInt(key, 10) - 1;
    }
  });

}
