var rlog = function (msg) {
  console.log('voice-chat: ' + (msg ? msg : '<EMPTY MESSAGE>'));
}

var rerror = function (msg) {
  console.error('*ERROR* voice-chat: ' + (msg ? msg : '<EMPTY MESSAGE>'));
}

navigator.getUserMedia = navigator.getUserMedia ||
                         navigator.webkitGetUserMedia ||
                         navigator.mozGetUserMedia ||
                         navigator.msGetUserMedia;

var PeerConnection = window.RTCPeerConnection ||
                     window.mozRTCPeerConnection ||
                     window.webkitRTCPeerConnection;

var SessionDescription = window.RTCSessionDescription ||
                         window.mozRTCSessionDescription ||
                         window.webkitRTCSessionDescription;

var IceCandidate = window.RTCIceCandidate ||
                   window.mozRTCIceCandidate ||
                   window.webkitRTCIceCandidate;

window.AudioContext = window.AudioContext || window.webkitAudioContext;

var emitter;
var pc = {};
var source = {};
var stream;
var config = {'iceServers':[{'url':'stun:stun.services.mozilla.com'}]};
var audioContext = new window.AudioContext();

function addIceCandidate(id, ev) {
  // The last ice candidate is always empty, no need to send it.
  if (ev.candidate) {
    var candidate = JSON.stringify(ev.candidate);
    rlog('emit ice to: ' + id + ' value: ' + candidate);
    emitter.emit('ice', id, candidate);
  } else {
    rlog('empty ice candidate for: ' + id);
  }
};

function addRemoteStream(id, ev) {
    rlog('adding remote stream to audio context');
    // Create an AudioNode from the stream
    if (source[id]) {
      source[id].disconnect();
    }
    source[id] = audioContext.createMediaStreamSource(ev.stream);

    // Connect it to destination to hear yourself
    // or any other node for processing!
    source[id].connect(audioContext.destination);
};

function gotStream(inStream) {
  stream = inStream;

  emitter.on('start-call', function (id) {
    rlog('start-call for: ' + id);
    if (pc[id]) {
      rerror('PeerConnection has already been created for: ' + id);
      return;
    }

    var peer = pc[id] = new PeerConnection(config, {});
    peer.onaddstream = addRemoteStream.bind(this, id);
    peer.onicecandidate = addIceCandidate.bind(this, id);
    if (stream) {
      peer.addStream(stream);
    }
    peer.createOffer(function(offer){
      peer.setLocalDescription(offer, function() {
        var strOffer = JSON.stringify(offer);
        rlog('emit offer to : ' + id + ' offer:\n' + strOffer);
        emitter.emit('offer', id, strOffer);
      },
      function (err) { rerror('Failed to set local description offer: ' + err); });
    },
    function (err) { rerror('Failed to create offer: ' + err); });
  });

  emitter.on('end-call', function (id) {
    rlog('end-call for: ' + id);

    if (pc[id]) {
      delete pc[id];
    }

    if (source[id]) {
      source[id].disconnect();
      delete source[id];
    }
  });

  emitter.on('offer', function (id, strOffer) {
    rlog('got offer from: ' + id + ' offer:\n' + strOffer);
    if (pc[id]) {
      rerror('in offer PeerConnection has already been created for: ' + id);
      return;
    }
    var offer = JSON.parse(strOffer);
    var peer = pc[id] = new PeerConnection(config, {});
    peer.onaddstream = addRemoteStream.bind(this, id);
    peer.onicecandidate = addIceCandidate.bind(this, id);
    if (stream) {
      peer.addStream(stream);
    }
    peer.setRemoteDescription(new SessionDescription(offer), function() {
      peer.createAnswer(function(answer) {
        peer.setLocalDescription(answer, function() {
          var strAnswer = JSON.stringify(answer);
          rlog('emit answer to : ' + id + ' answer: ' + strAnswer);
          emitter.emit('answer', id, strAnswer);
        },
        function (err) { rerror('Failed to setLocalDescription: ' + err); });
      },
      function (err) { rerror('Failed to createAnswer: ' + err); });
    },
    function (err) { rerror('Failed to setRemoteDescription: ' + err); });
  });

  emitter.on('answer', function (id, strAnswer) {
    rlog('got answer from: ' + id + ' answer:\n' + strAnswer);
    var peer = pc[id];
    if (!peer) {
      rerror('in answer No peer was create for answer for id: ' + id);
      return;
    }
    var answer = JSON.parse(strAnswer);
    peer.setRemoteDescription(new SessionDescription(answer),
      function () {
        rlog('Set answer: ' + strAnswer);
      },
      function (err) {
        rlog('Failed to set answer: ' + err);
      });
  });

  emitter.on('ice', function (id, ice) {
    var peer = pc[id];
    if (!peer) {
      rerror('No peer was create for ice candidate from id: ' + id);
      return;
    }
    rlog('add ice candidate for: ' + id + ' candidate: ' + ice);
    peer.addIceCandidate(new IceCandidate(JSON.parse(ice)));
  });

  rlog('emit stream-ready');
  emitter.emit('stream-ready');
}

function failedToGetStream(err) {
  rerror('Failed to get audio stream: ' + err);
  // Go ahead and create the PeerConnection, the user should
  // still be able to hear even if they can't talk to the other users.
  gotStream(undefined);
}

module.exports = function (aEmitter) {
  if (!navigator.getUserMedia) {
    return;
  }

  emitter = aEmitter;

  navigator.getUserMedia({audio:true}, gotStream, failedToGetStream);
}

