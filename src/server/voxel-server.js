var http = require('http')
var ecstatic = require('ecstatic')
var WebSocketServer = require('ws').Server
var websocket = require('websocket-stream')
var duplexEmitter = require('duplex-emitter')
var path = require('path')
var uuid = require('uuid').v4
var crunch = require('voxel-crunch')
var engine = require('voxel-engine')
var voxel = require('voxel')
var createPlugins = require('voxel-plugins');

var PermaObject = require('./lib/permaobject');

// voxel-plugins
require('voxel-blockdata');

var primitives = [{
  color: '#ffffff'
}, {
  color: '#000000'
}, {
  color: '#00e0f6'
}, {
  color: '#74cd59'
}, {
  color: '#cb8503'
}, {
  color: '#697dd3'
}, {
  color: '#ee4fcf'
}];

module.exports = function(opts) {
  // these settings will be used to create an in-memory
  // world on the server and will be sent to all
  // new clients when they connect
  var settings = {
    // Generate a flat world.
    generate: function(x, y, z) {
      return y <= 1 ? 1 : 0
    },
    chunkDistance: 2,
    materials: primitives.map(function(o) {
      return o.color
    }),
    materialFlatColor: true,
    worldOrigin: [0, 0, 0],
    controls: {
      discreteFire: true
    },
    avatarInitialPosition: [2, 20, 2]
  }

  var game = engine(settings);

  var server = (opts.server) ? opts.server : http.createServer(ecstatic(path.join(__dirname, 'www')));

  var wss = new WebSocketServer({
    server: server
  });

  var clients = {};
  var chunkCache = {};
  var usingClientSettings = false;


  // simple version of socket.io's sockets.emit
  function broadcast(id, cmd, arg1, arg2, arg3, emitter) {
    Object.keys(clients).map(function(client) {
      if (client === id) return
      if (client in clients) {
        if (id && clients[id].room !== clients[client].room) {
          return;
        }
        clients[client].emit(cmd, arg1, arg2, arg3);
      }
    });

    if (emitter) {
      if (cmd === 'message') {
        emitter.messages.push([arg1, arg2, arg3]);
      } else if (cmd === 'set') {
        emitter.blocks.push([arg1, arg2, arg3]);
      }
    }
  }


  var update = {
    positions: {},
    date: +new Date()
  };

  function sendUpdate() {
    var clientKeys = Object.keys(clients)
    if (clientKeys.length === 0) return
    update.positions = {};
    update.date = +new Date();
    clientKeys.map(function(key) {
      var emitter = clients[key]
      update.positions[key] = {
        position: emitter.player.position,
        rotation: {
          x: emitter.player.rotation.x,
          y: emitter.player.rotation.y
        }
      }
    });
    broadcast(null, 'update', update);
  }

  setInterval(sendUpdate, 1000 / 22) // 45ms

  // load voxel-plugins
  var plugins = createPlugins(game, {require:require})
  plugins.add('voxel-blockdata',{})
  plugins.loadAll()

  var blockdata = game.plugins.get('voxel-blockdata');


  wss.on('connection', function (ws) {
    // turn 'raw' websocket into a stream
    var stream = websocket(ws)

    var emitter = duplexEmitter(stream)

    emitter.on('clientSettings', function(clientSettings) {
      // Enables a client to reset the settings to enable loading new clientSettings
      if (clientSettings != null) {
        if (clientSettings.resetSettings != null) {
          console.log("resetSettings:true")
          usingClientSettings = null
          if (game != null) game.destroy()
          game = null
          chunkCache = {}
        }
      }

      if (clientSettings != null && usingClientSettings == null) {
        usingClientSettings = true
          // Use the correct path for textures url
          //clientSettings.texturePath = texturePath
          //deserialise the voxel.generator function.
        if (clientSettings.generatorToString != null) {
          clientSettings.generate = eval("(" + clientSettings.generatorToString + ")")
        }
        settings = clientSettings
        console.log("Using settings from client to create game.")
        game = engine(settings)
      } else {
        if (usingClientSettings != null) {
          console.log("Sending current settings to new client.")
        } else {
          console.log("Sending default settings to new client.")
        }
      }
    })

    var id = uuid()
    clients[id] = emitter

    emitter.player = {
      rotation: new game.THREE.Vector3(),
      position: new game.THREE.Vector3()
    }

    console.log(id, 'joined')
    emitter.emit('id', id)
    broadcast(id, 'join', id)
    stream.once('end', leave)
    stream.once('error', leave)

    function leave() {
      delete clients[id]
      console.log(id, 'left')
      broadcast(id, 'leave', id)
    }

    emitter.on('message', function (message) {
      message.text = (message.text || '').substr(0, 140);
      if (message.text.length === 0) return;
      console.log('[%j] chat: %s', message.timestamp, message);
      broadcast(id, 'message', message, null, null, emitter);
    });

    // give the user the initial game settings
    if (settings.generate != null) {
      settings.generatorToString = settings.generate.toString()
    }
    emitter.emit('settings', settings)

    // fires when the user tells us they are
    // ready for chunks to be sent
    emitter.on('created', function (room) {
      emitter.room = room;
      emitter.messages = new PermaObject('messages__' + room, []);
      emitter.blocks = new PermaObject('blocks__' + room, []);

      sendInitialChunks(emitter)
        // fires when client sends us new input state
      emitter.on('state', function(state) {
        emitter.player.rotation.x = state.rotation.x
        emitter.player.rotation.y = state.rotation.y
        var pos = emitter.player.position
        var distance = pos.distanceTo(state.position)
        if (distance > 20) {
          var before = pos.clone()
          pos.lerp(state.position, 0.1)
          return
        }
        pos.copy(state.position)
      })
    })

    emitter.on('set', function(pos, val, data) {
      var chunkPos = game.voxels.chunkAtPosition(pos);
      var chunkID = chunkPos.join('|');
      if (chunkCache[chunkID]) delete chunkCache[chunkID];
      if (data) blockdata.set(pos[0], pos[1], pos[2], data);
      broadcast(id, 'set', pos, val, data, emitter);
    });
  });

  function sendInitialChunks(emitter) {
    Object.keys(game.voxels.chunks).map(function(chunkID) {
      var chunk = game.voxels.chunks[chunkID]
      var encoded = chunkCache[chunkID]
      if (!encoded) {
        encoded = crunch.encode(chunk.voxels)
        chunkCache[chunkID] = encoded
      }
      emitter.emit('chunk', encoded, {
        position: chunk.position,
        dims: chunk.dims,
        length: chunk.voxels.length
      })
    })
    emitter.emit('noMoreChunks', true);

    // Send messages and blocks that were persisted on the server.
    emitter.messages.forEach(function (message) {
      emitter.emit('message', message);
    });
    emitter.blocks.forEach(function (block) {
      emitter.emit('set', block[0], block[1], block[2]);
    });
  }

  return game
}
