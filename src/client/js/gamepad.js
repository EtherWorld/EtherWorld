module.exports = function (game) {

  var controls = game.controls;
  var oriStream = controls.createWriteRotationStream();
  var standardControllerOffsetHack = 0;
  var oldButtons = [];
  var oldAxes = [];

  function clamp(value) {
    var result = value;
    if (result > 1) {
      result = 1;
    }
    else if (result < -1) {
      result = -1;
    }

    result = result * result * (result >= 0 ? 1 : -1);

    if ((result < 0.05) && (result > -0.05)) {
      result = 0;
    }

    return result;
  }

  function tick(delta) {
    var gamepads = navigator.getGamepads ? navigator.getGamepads() : (navigator.webkitGetGamepads ? navigator.webkitGetGamepads() : []);

    var gp;
    var pad = 0;

    while (!gp && (pad < gamepads.length)) {
      gp = gamepads[pad];
      pad++;
    }

    if (gp) {

      // On Standard mapped controllers, the axes starts at zero.
      // On unmapped controllers most start at one.
      // If axis zero has a value then it is probably standard mapped.
      if (gp.axes[0] != 0) {
        standardControllerOffsetHack = 1;
      }

      var axes = gp.axes.map(function (axis) {
        return clamp(axis);
      });

      var buttons = [];
      for (var index = 0; index < gp.buttons.length; index++) {
        buttons[index] = gp.buttons[index].pressed;
      }

      var zAxis = 2 - standardControllerOffsetHack;
      var xAxis = 1 - standardControllerOffsetHack;
      var yawAxis = 3 - standardControllerOffsetHack;
      var pitchAxis = 4 - standardControllerOffsetHack;

      var target = controls.target();

      if (axes[zAxis] < 0) {
        controls.state.forward = target.forward = true;
        controls.state.backward = target.backward = false;
      }
      else if (axes[zAxis] > 0) {
        controls.state.backward = target.backward = true;
        controls.state.forward = target.forward = false;
      }
      else if (axes[zAxis] != oldAxes[zAxis]) {
        controls.state.backward = target.backward = false;
        controls.state.forward = target.forward = false;
      }

      target.velocity.z = axes[zAxis] * controls.max_speed;

      if (axes[xAxis] < 0) {
        controls.state.left = target.left = true;
        controls.state.right = target.right = false;
      }
      else if (axes[xAxis] > 0) {
        controls.state.left = target.left = false;
        controls.state.right = target.right = true;
      }
      else if (axes[xAxis] != oldAxes[xAxis]) {
        controls.state.left = target.left = false;
        controls.state.right = target.right = false;
      }

      target.velocity.x = axes[xAxis] * controls.max_speed;

      var pitch = axes[pitchAxis] * delta;
      var yaw = axes[yawAxis] * delta;

      oriStream.write({dy:pitch, dx:yaw, dz:0});

      var gpmap = GamepadMap[gp.id] || GamepadMap['default'];

      if (buttons[gpmap.fire] && (buttons[gpmap.fire] != oldButtons[gpmap.fire])) {
        game.onFire();
      }

      if (buttons[gpmap.fly] && (buttons[gpmap.fly] != oldButtons[gpmap.fly])) {
        if (game.playerFly.flying) {
          game.playerFly.stopFlying();
        } else {
          game.playerFly.startFlying();
        }
      }

      if ((buttons[gpmap.jump] != oldButtons[gpmap.jump])) {
        controls.state.jump = buttons[gpmap.jump];
      }

      if ((buttons[gpmap.crouch] != oldButtons[gpmap.crouch])) {
        controls.state.crouch = buttons[gpmap.crouch];
      }

      oldAxes = axes;
      oldButtons = buttons;
    }
  };

  game.on('tick', tick);
};

var GamepadMap = {
  '54c-268-PLAYSTATION(R)3 Controller': {
    fire: 13,
    fly: 11,
    jump: 14,
    crouch: 9,
  },
  '46d-c216-Logitech Dual Action': {
    fire: 0,
    fly: 3,
    jump: 4,
    crouch: 5,
  },
  'b05-4500-ASUS Gamepad': {
    fire: 4,
    fly: 5,
    jump: 6,
    crouch: 7,
  },
  'android': {
    fire: 2,
    fly: 3,
    jump: 4,
    crouch: 5,
  },
  'default': {
    fire: 2,
    fly: 3,
    jump: 4,
    crouch: 5,
  }
};

