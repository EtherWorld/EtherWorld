var rlog = function (msg) {
  console.log('voice-chat-server: ' + (msg ? msg : '<EMPTY MESSAGE>'));
}

var rerror = function (msg) {
  console.error('*ERROR* voice-chat-server: ' + (msg ? msg : '<EMPTY MESSAGE>'));
}

module.exports = function (clients) {
  return new VoiceChat(clients);
}

function VoiceChat(clients) {
  this.clients = clients;
}

VoiceChat.prototype.addClient = function (id) {
  rlog('Add client to voice chat: ' + id);
  var emitter = this.clients[id];
  var self = this;
  emitter.player.voiceChatReady = false;

  var targetKeys = Object.keys(this.clients);

  emitter.on('stream-ready', function () {
    rlog('stream-ready for: ' + id);
    emitter.on('offer', function (targetId, offer) {
      var target = self.clients[targetId];
      if (target) {
        rlog('emit offer: ' + offer + ' to: ' + targetId);
        target.emit('offer', id, offer);
      } else {
        rerror('Failed to emit offer: ' + offer);
      }
    });

    emitter.on('answer', function (targetId, answer) {
      var target = self.clients[targetId];
      if (target) {
        rlog('emit answer: ' + answer);
        target.emit('answer', id, answer);
      } else {
        rerror('Failed to emit answer: ' + answer + ' to: ' + targetId);
      }
    });

    emitter.on('ice', function (targetId, ice) {
      var target = self.clients[targetId];
      if (target) {
        rlog('emit ice: ' + ice);
        target.emit('ice', id, ice);
      } else {
        rerror('Failed to emit ice: ' + ice + ' to: ' + targetId);
      }
    });

    emitter.player.voiceChatReady = true;

    targetKeys.map(function (key) {
      var target = self.clients[key];
      if ((key != id) && target && (target.room == emitter.room)) {
        if (target.player.voiceChatReady) {
          rlog('emit start-call from: ' + id + ' to: ' + key);
          emitter.emit('start-call', key);
        } else {
          // They aren't ready yet, have them call us when they are
          if (!target.player.waitingCalls) {
            target.player.waitingCalls = {};
          }
          rlog('adding ' + id + ' to: ' + key + ' wait-to-call list');
          target.player.waitingCalls[id] = true;
        }
      }
    });

    // Call anyone who was ready before we were.
    if (emitter.player.waitingCalls) {
      Object.keys(emitter.player.waitingCalls).map(function (key) {
        var target = self.clients[key];
        if ((key != id) && target && (target.room == emitter.room)) {
          rlog('emit start-call from wait-to-call list from: ' + id + ' to: ' + key);
          emitter.emit('start-call', key);
        } else {
          rerror('Failed to emit start-call from: ' + id + ' to: ' + key);
        }
      });

      emitter.player.waitingCalls = undefined;
    }
  });
}

VoiceChat.prototype.removeClient = function (id) {
rlog('Remove client to voice chat: ' + id);
  var emitter = this.clients[id];
  var self = this;

  Object.keys(this.clients).map(function (key) {
    if (key != id && self.clients[key]) {
      try {
        self.clients[key].emit('end-call', id);
      } catch (e) {
        console.error('Unhandled exception sending end-call to: ' + key + ' error: ' + e);
      }
    }
  });
}
