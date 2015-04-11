
module.exports = function (game) {

  var controls = game.controls;
  var oriStream = controls.createWriteRotationStream();
  var androidOffsetHack = 0;
  var oldButtons = [];

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
    // use mapped gamepad code here.
    var gamepads = navigator.getGamepads ? navigator.getGamepads() : (navigator.webkitGetGamepads ? navigator.webkitGetGamepads : []);

    var axes;
    var buttons = [];

    for (var pad = 0; pad < gamepads.length; pad++) {

      if (!axes) {
        axes = [];
      }

      var gp = gamepads[pad];
      if (gp) {
        var str = "a:"
        for (var which = 0; which < gp.axes.length; which++) {
          var value = clamp(gp.axes[which]);
          str = str + ' ' + which + ':' + (value != 0 ? '1' : '0');
          if (which >= axes.length) {
             axes[which] = value;
          }
          else if (((axes[which] >= 0) && (value > axes[which])) ||
              ((axes[which] <= 0) && (value < axes[which]))) {
            axes[which] = value;
          }
        }
        str = str + " b:"
        for (var which = 0; which < gp.buttons.length; which++) {
          buttons[which] = gp.buttons[which].value;
          str = str + ' ' + which + ':' + gp.buttons[which].value;
        }
        //console.log(str);
      }
    }

    if (axes) {

      if (axes[0] != 0) {
        androidOffsetHack = 1;
      }

      var zAxis = 2 - androidOffsetHack;
      var xAxis = 1 - androidOffsetHack;
      var yawAxis = 3 - androidOffsetHack;
      var pitchAxis = 4 - androidOffsetHack;

      var target = controls.target();

      if (axes[zAxis] < 0) {
        controls.state.forward = target.forward = true;
        controls.state.backward = target.backward = false;
      }
      else if (axes[zAxis] > 0) {
        controls.state.backward = target.backward = true;
        controls.state.forward = target.forward = false;
      }
      else {
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
      else {
        controls.state.left = target.left = false;
        controls.state.right = target.right = false;
      }

      target.velocity.x = axes[xAxis] * controls.max_speed;

      var pitch = axes[pitchAxis] * delta;
      var yaw = axes[yawAxis] * delta;

      oriStream.write({dy:pitch, dx:yaw, dz:0});

      var fire = 0,
        fly = 3,
        jump = 4,
        crouch = 5;

      if (buttons[fire] && (buttons[fire] != oldButtons[fire])) {
        game.onFire();
      }

      if (buttons[fly] && (buttons[fly] != oldButtons[fly])) {
        if (game.playerFly.flying) {
          game.playerFly.stopFlying();
        } else {
          game.playerFly.startFlying();
        }
      }

      if ((buttons[jump] != oldButtons[jump])) {
        controls.state['jump'] = buttons[jump];
      }

      if ((buttons[crouch] != oldButtons[crouch])) {
        controls.state['crouch'] = buttons[crouch];
      }

      oldButtons = buttons;
    }
  };

  game.on('tick', tick);
};
