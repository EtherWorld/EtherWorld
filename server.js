var fs = require('fs');

var utils = require('./lib/utils');

// Socket.io mapping.
var sockets = {};

// Webserver.
var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var port = process.env.PORT || 3000;

// Routes that should render `/index.html` and get routed on the client.
const SPA_ROUTES = [
  '/room/:room'
];


app.use('/js/', express.static(__dirname + '/build/js'));
app.use('/css/', express.static(__dirname + '/build/css'));
app.use(express.static(__dirname + '/src'));

io.on('connection', function (socket) {
  console.log('got connection');
  sockets[socket.id] = socket;

  socket.on('disconnect', function () {
    delete sockets[socket.id];
  });

  socket.on('move', function (data) {
  });
});

app.get('/room/:room?', function (req, res, next) {
  var roomName = req.params.room;

  if (!roomName) {
    res.redirect('/room/' + utils.randomString());
    return;
  }

  next();
});

SPA_ROUTES.forEach(function (route) {
  app.get(route, function (req, res) {
    res.sendFile(__dirname + '/src/index.html');
  })
});

server.listen(port, function () {
  console.log('Server listening at port %d', port);
});
