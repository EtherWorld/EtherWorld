var urllib = require('url');
var qs = require('query-string');

var extend = require('extend');
var Grapnel = require('grapnel');
var storage = require('local-storage');

var highlight = require('voxel-highlight');
var player = require('voxel-player');
var voxel = require('voxel');
var walk = require('voxel-walk');
var createClient = require('../../server/voxel-client');
var utils = require('../../lib/utils');
var game;


module.exports = function (opts, setup) {
  var GET = qs.parse(window.location.search);
  var router = new Grapnel({pushState: true});

  router.navigate(window.location.href);

  router.get('/room/:room', function (req) {
    var roomName = req.params.room;
    console.log('room: %s', roomName);
  });

  var username = storage.get('username');
  if (!username) {
    username = prompt('Choose a username');
    storage.set('username', username);
  }

  console.log('username: %s', username);

  // voxel game
  setup = setup || defaultSetup;
  opts = extend({}, opts || {});

  var client = createClient(opts.server);

  client.emitter.on('noMoreChunks', function() {
    console.log("Attaching to the container and creating player")

    var container = opts.container || document.body;

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
  })
  return game
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
  hl.on('highlight', function (voxelPos) { blockPosErase = voxelPos })
  hl.on('remove', function () { blockPosErase = null })
  hl.on('highlight-adjacent', function (voxelPos) { blockPosPlace = voxelPos })
  hl.on('remove-adjacent', function () { blockPosPlace = null })

  // toggle between first and third person modes
  window.addEventListener('keydown', function (ev) {
    if (ev.keyCode === 'R'.charCodeAt(0)) avatar.toggle()
  })

  // block interaction stuff, uses highlight data
  var currentMaterial = 2

  // Set the initial toolbar state
  var initialActiveSlot = document.querySelector(`#toolbar [data-slot="3"]`);
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
    var toolbarSlot = document.querySelector(`#toolbar [data-slot="${slotIdx}"]`);
    toolbarSlot.style.backgroundColor = primitive;
  });

  window.addEventListener('keydown', e => {
    var key = String.fromCharCode(e.which);
    if (key.match(/[0-9]{1}/)) {
      console.log('change active item', key);
      var oldActiveItem = document.querySelector('#toolbar .active[data-slot]');
      if (oldActiveItem) {
        oldActiveItem.classList.remove('active');
      }

      var newActiveSlot = document.querySelector(`#toolbar [data-slot="${key}"]`);
      if (newActiveSlot) {
        newActiveSlot.classList.add('active');
      }

      currentMaterial = parseInt(key, 10) - 1;
    }
  });

}
