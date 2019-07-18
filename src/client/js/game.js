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

var client;
var game;

var $ = utils.$;

const REDIRECT_TO_EXTERNAL_LINKS = true;  // Set to `false` to use iframes.


module.exports = function(opts, setup) {
  var GET = qs.parse(window.location.search);

  var router = new Grapnel({
    pushState: true
  });
  router.divert = uri => {
    window.history.replaceState({}, null, uri);
    router.trigger('navigate').trigger('divert');
  };

  var main = $('#main');

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

  router.get('/*', function () {
    // If the user is navigating away from the iframe view,
    // make sure we then hide the iframe.
    if (this.fragment.get().indexOf('/link/') !== 0) {
      var iframe = $('#link__iframe.visible');
      if (iframe) {
        iframe.src = '#';
        iframe.classList.remove('visible');
      }
    }
  });

  router.get('/', function(req) {
    console.log('[%s] Navigated to view', utils.getCurrentPath());

    template.prepend('/');
  });

  router.get('/room/:room?', function(req) {
    console.log('[%s] Navigated to view', utils.getCurrentPath());

    var roomName = req.params.room;

    if (!roomName) {
      router.divert('/room/' + gameUtils.randomString());
      return;
    }

    console.log('[%s] room: %s', utils.getCurrentPath(), roomName);

    var username = storage.get('username');
    if (!username) {
      username = prompt('Choose a username');
      storage.set('username', username);
    }

    console.log('[%s] username: %s', utils.getCurrentPath(), username);

    if (game && game.attached && main.getAttribute('data-route') === this.state.route) {
      client.emitter.emit('created', roomName);
    } else {
      template.render(this.state.route);
      startGame(roomName);
    }
  });

  router.get('/link/:link', req => {
    var path = utils.getCurrentPath();
    console.log('[%s] Navigated to view', path);

    var linkUrl = req.params.link;

    console.log('[%s] link: %s', path, linkUrl);

    var iframe = $('#link__iframe');
    if (!iframe) {
      template.append('/link/:link');
      iframe = $('#link__iframe');
    }

    iframe.classList.add('visible');
    iframe.src = linkUrl;
    iframe.onload = function () {
      document.body.classList.remove('fade');
      utils.exitPointerLock(document);
    };
  });

  function loadLink(linkUrl) {
    var path = utils.getCurrentPath();

    console.log('[%s] link: %s', path, linkUrl);

    if (utils.isRoom(linkUrl)) {
      router.navigate('/room/' + linkUrl);
      return;
    }

    var roomMatches = linkUrl.match(
      window.location.origin + '/room/' + utils.reStringRoomUrl, 'i'
    );

    if (roomMatches && utils.isRoom(roomMatches[1])) {
      router.navigate('/room/' + roomMatches[1]);
      return;
    }

    if (REDIRECT_TO_EXTERNAL_LINKS) {
      window.location.href = linkUrl;
    } else {
      router.navigate('/link/' + encodeURIComponent(linkUrl));
    }
  }

  function startGame(roomName) {
    // voxel game
    setup = setup || defaultSetup;
    opts = extend({}, opts || {});

    client = createClient({
      server: opts.server,
      room: roomName
    });

    client.emitter.on('noMoreChunks', function() {
      if (game && game.attached) {
        game.items.forEach(item => {
          if (item.mesh) {
            game.removeItem(item);
          }
          if (item.position) {
            client.blockdata.clear(item.position.x, item.position.y, item.position.z);
          }
        });
        document.body.classList.remove('fade');
        console.log('Clearing room since game is already attached');
        return;
      }

      console.log("Attaching to the container and creating player")

      var container = opts.containerSelector ? $(opts.containerSelector) : (opts.container || document.body);

      game = client.game;

      game.appendTo(container);
      game.attached = true;

      gamepad(game);

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
    utils.requestPointerLock(main);
  };

  var promptUrl = function() {
    return new Promise(resolve => {
      var form = $('#url-input-form');
      console.log('Got form', form)
      if (!form) {
        template.append('/url_prompt');
        form = $('#url-input-form');
      }

      utils.exitPointerLock(document);

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
        loadLink(utils.formatLinkUrl(bd.link));
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
    var controls = vrcontrols(game);
    var effect = new oculus(game, {distortion: 0, separation: 0.01});
    var vrHMD;

    var fsButton = $('#fullscreen');
    var vrButton = $('#vr');

    var gotVRDevices = function(devices) {
      for (var i = 0; i < devices.length; i ++) {
        if (devices[i] instanceof HMDVRDevice) {
          vrHMD = devices[i];
          break;
        }
      }
    };

    var handleFsChange = function(e) {
      var fullscreenElement = document.fullscreenElement ||
        document.mozFullScreenElement ||
        document.webkitFullscreenElement;

      if (fullscreenElement == null) {
        effect.disable();
      }
    };

    if (navigator.getVRDevices) {
      navigator.getVRDevices().then(gotVRDevices);
    }

    var launchVr = function() {
      utils.launchFs(game.view.element, { vrDisplay: vrHMD });
      effect.enable();
    }

    document.addEventListener('mozfullscreenchange', handleFsChange);
    document.addEventListener('webkitfullscreenchange', handleFsChange);
    vrButton.addEventListener('click', launchVr)
    fsButton.addEventListener('click', function() {
      utils.launchFs(main);
    });

    window.addEventListener('keydown', e => {
      if (utils.fieldFocused(e)) {
        return;
      }

      // Toggle between materials (colours).
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

      if (e.which === 27 || e.key === 'Escape') {
        var form = $('#url-input-form');
        if (form) {
          hidePrompt(form);
        }
      }

      if (!ev.metaKey) {
        switch (key) {
          case 'R': // toggle between first- and third-person modes
            avatar.toggle();
            break;
          case 'V': // enter VR mode
            launchVr();
            break;
          case 'Z': // zero HMD sensor
            controls.resetSensor();
            break;
        }
      }

    });
  }

};
