var storage = require('./storage');


function Lobby() {
  this.rooms = this.getRooms();
}


Lobby.prototype.getRooms = function () {
  return storage.get('rooms') || [];
};


Lobby.prototype.saveRooms = function () {
  return storage.set('rooms', this.rooms);
};


Lobby.prototype.addRoom = function (room) {
  if (this.rooms.indexOf(room) === -1) {
    this.rooms.push(room);
    this.saveRooms();
  }
};


module.exports = Lobby;
