var urllib = require('url');
var qs = require('query-string');

var extend = require('extend');
var Grapnel = require('grapnel');
var storage = require('local-storage');

var highlight = require('voxel-highlight');
var player = require('voxel-player');
var voxel = require('voxel');
var walk = require('voxel-walk');

var gameUtils = require('../../shared/game-utils');

var createClient = require('./voxel-client');
var gamepad = require('./gamepad');
var oculus = require('voxel-oculus');
var template = require('./template');
var utils = require('./lib/utils');
var vrcontrols = require('./vrcontrols');

var game;

var $ = utils.$;


module.exports = function(opts, setup) {
  var GET = qs.parse(window.location.search);
  var router = new Grapnel({
    pushState: true
  });
  var main = $('#main');

  var renderTemplate = function(route) {
    main.innerHTML = $('template[data-route="' + route + '"]').innerHTML;
  };

  var isValidNavigationLink = function(el) {
    var href = el.href || el.action;
    return (!href ||
      href[0] === '#' ||
      href.substr(0, 4) === 'http' ||
      href.substr(0, 7) === 'mailto:' ||
      href.substr(0, 11) === 'javascript:' || // jshint ignore:line
      href.indexOf('.gif') !== -1 ||
      href.indexOf('.png') !== -1 ||
      href.indexOf('.jpg') !== -1 ||
      el.getAttribute('target') ||
      el.getAttribute('rel') === 'external'
    );
  };

  // Hijack clicks so the SPA can handle the navigation.
  document.body.addEventListener('click', function(e) {
    if (e.target.tagName.toLowerCase() !== 'a' || e.metaKey || e.ctrlKey ||
      e.button !== 0 || !isValidNavigationLink(e.target)) {

      return;
    }
    e.preventDefault();
    e.stopPropagation();
    router.navigate(e.target.href);
  }, true);

  router.get('/', function(req) {
    console.log('[%s] Navigated to view', utils.getCurrentPath());

    var roomName = 'splash';
    console.log('[%s] room: %s', this.state.route, roomName);

    template.prependTemplate('/');
  });

  router.get('/room/:room?', function(req) {
    console.log('[%s] Navigated to view', utils.getCurrentPath());

    var roomName = req.params.room;

    if (!roomName) {
      window.history.replaceState({}, null, '/room/' + gameUtils.randomString());
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

    startGame(roomName);
  });

  function startGame(roomName) {
    // voxel game
    setup = setup || defaultSetup;
    opts = extend({}, opts || {});

    var client = createClient({
      server: opts.server,
      room: roomName
    });

    client.emitter.on('noMoreChunks', function() {
      console.log("Attaching to the container and creating player")

      var container = opts.containerSelector ? $(opts.containerSelector) : (opts.container || document.body);

      game = client.game;

      gamepad(game);

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

  var hidePrompt = function(form) {
    form.parentNode.removeChild(form);

    main.requestPointerLock = main.requestPointerLock ||
                              main.mozRequestPointerLock ||
                              main.webkitRequestPointerLock;
    main.requestPointerLock();
  };

  var promptUrl = function() {
    return new Promise(resolve => {
      var form = $('#url-input-form');
      console.log('Got form', form)
      if (!form) {
        template.appendTemplate('/url_prompt');
        form = $('#url-input-form');
      }

      document.exitPointerLock = document.exitPointerLock ||
                                 document.mozExitPointerLock ||
                                 document.webkitExitPointerLock;
      document.exitPointerLock();

      var input = $('#url-input');
      input.focus();

      form.addEventListener('submit', e => {
        e.preventDefault();
        var value = input.value;
        hidePrompt(form);
        resolve(value);
      });
    });
  }

  function defaultSetup(game, avatar, client) {
    // highlight blocks when you look at them, hold <Ctrl> for block placement
    var blockPosPlace, blockPosErase
    var hl = game.highlighter = highlight(game, {
      color: 0xff0000,
      adjacentActive: function() {
        return currentMaterial !== 0;
      }
    })
    hl.on('highlight', function(voxelPos) {
      blockPosErase = voxelPos
    })
    hl.on('remove', function() {
      blockPosErase = null
    })
    hl.on('highlight-adjacent', function(voxelPos) {
      blockPosPlace = voxelPos
    })
    hl.on('remove-adjacent', function() {
      blockPosPlace = null
    })

    // toggle between first and third person modes
    window.addEventListener('keydown', function(ev) {
      if (ev.keyCode === 'R'.charCodeAt(0)) avatar.toggle()
    })

    // block interaction stuff, uses highlight data
    var currentMaterial = 2

    // Set the initial toolbar state
    var initialActiveSlot = $(`#toolbar [data-slot="3"]`);
    initialActiveSlot.classList.add('active');

    // handle user avatar collisions into items
    game.on('collision', utils.debounce(function(item) {
      var position = item.yaw.position;
      var bd = client.blockdata.get(position.x, position.y, position.z);
      if (bd) {
        document.body.classList.add('fade');
        setTimeout(() => {
          window.location.href = utils.formatUrl(bd.link);
        }, 200);
        return;
      }
    }, 250));

    game.on('fire', function() {
      var position = blockPosPlace
      if (position) {
        var data;
        var bd = client.blockdata.get(position[0], position[1], position[2]);
        var LINK_BLOCK_ID = 8;
        if (currentMaterial === LINK_BLOCK_ID) {
          if (bd) {
            game.scene.remove(bd.mesh);
            client.blockdata.clear(position[0], position[1], position[2]);
            return;
          }
          promptUrl().then(url => {
            data = {
              link: url
            };

            client.emitter.emit('set', position, currentMaterial, data);
          });
        } else {
          game.createBlock(position, currentMaterial);
          client.emitter.emit('set', position, currentMaterial);
        }
      } else {
        position = blockPosErase;
        if (position) {
          client.emitter.emit('set', position, 0);
        }
      }
    })

    game.settings.materials.forEach((primitive, idx) => {
      var slotIdx = idx + 2;
      var toolbarSlot = $(`#toolbar [data-slot="${slotIdx}"]`);
      toolbarSlot.style.backgroundColor = primitive;
    });


    // VR
    vrcontrols(game);

    var effect = new oculus(game, {distortion: 0, separation: 0.01});

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

      if (key === 'V') {
        effect.toggle();
      }

      if (e.which === 27 || e.key === 'Escape') {
        var form = $('#url-input-form');
        if (form) {
          hidePrompt(form);
        }
      }
    });
  }

};
