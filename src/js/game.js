var urllib = require('url');
var qs = require('query-string');

var extend = require('extend');
var Grapnel = require('grapnel');
var storage = require('local-storage');

var createGame = require('voxel-engine');
var fly = require('voxel-fly');
var highlight = require('voxel-highlight');
var player = require('voxel-player');
var voxel = require('voxel');
var walk = require('voxel-walk');

var utils = require('../../lib/utils');

var primitives = [
  {
    color: '#ffffff'
  },
  {
    color: '#000000'
  },
  {
    color: '#00e0f6'
  },
  {
    color: '#74cd59'
  },
  {
    color: '#cb8503'
  },
  {
    color: '#697dd3'
  },
  {
    color: '#ee4fcf'
  }
];

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

  setup = setup || defaultSetup
  var defaults = {
    //generate: voxel.generator.Valley,

    // Generate a flat world.
    generate: function(x, y, z) {
      return y === 1 ? 1 : 0
    },
    chunkDistance: 2,
    materials: primitives.map(o => o.color),
    materialFlatColor: true,
    worldOrigin: [0, 0, 0],
    controls: { discreteFire: true }
  }
  opts = extend({}, defaults, opts || {})

  // setup the game and add some trees
  var game = createGame(opts)
  var container = opts.container || document.body
  window.game = game // for debugging
  game.appendTo(container)
  if (game.notCapable()) return game

  var createPlayer = player(game)

  // create the player from a minecraft skin file and tell the
  // game to use it as the main player
  var avatar = createPlayer(opts.playerSkin || '/img/player.png')
  avatar.possess()
  avatar.yaw.position.set(2, 14, 4)

  setup(game, avatar)

  return game
}

function defaultSetup(game, avatar) {

  var makeFly = fly(game)
  var target = game.controls.target()
  game.flyer = makeFly(target)

  // Highlight blocks when you look at them.
  // If the current selected slot is the first block, then we're removing blocks.
  // Otherwise we place the selected block.
  var blockPosPlace, blockPosErase
  var hl = game.highlighter = highlight(game, {
    color: 0xff0000,
    adjacentActive: function() {
      return currentMaterial !== 0;
    }
  })
  hl.on('highlight', function (voxelPos) { blockPosErase = voxelPos })
  hl.on('remove', function () { blockPosErase = null })
  hl.on('highlight-adjacent', function (voxelPos) {blockPosPlace = voxelPos })
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

  game.on('fire', function () {
    var position = blockPosPlace
    if (position) {
      game.createBlock(position, currentMaterial)
    }
    else {
      position = blockPosErase
      if (position) game.setBlock(position, 0)
    }
  })

  primitives.forEach((primitive, idx) => {
    var slotIdx = idx + 2;
    var toolbarSlot = document.querySelector(`#toolbar [data-slot="${slotIdx}"]`);
    toolbarSlot.style.backgroundColor = primitive.color;
  });

  window.addEventListener('keydown', e => {
    if (String(e.key).match(/[0-9]{1}/)) {
      console.log('change active item', e.key);
      var oldActiveItem = document.querySelector('#toolbar .active[data-slot]');
      if (oldActiveItem) {
        oldActiveItem.classList.remove('active');
      }

      var newActiveSlot = document.querySelector(`#toolbar [data-slot="${e.key}"]`);
      if (newActiveSlot) {
        newActiveSlot.classList.add('active');
      }

      currentMaterial = parseInt(e.key, 10) - 1;
    }
  });

  game.on('tick', function () {
    walk.render(target.playerSkin)
    var vx = Math.abs(target.velocity.x)
    var vz = Math.abs(target.velocity.z)
    if (vx > 0.001 || vz > 0.001) walk.stopWalking()
    else walk.startWalking()
  })
}
