module.exports = function (game) {
  var THREE = game.THREE;
  var camera = game.camera;

  camera.useQuaternion = true;

  THREE.VRControls = function ( object, onError ) {
    var vrInputs = [];

    function filterInvalidDevices( devices ) {
      // Exclude Cardboard position sensor if Oculus exists.
      var oculusDevices = devices.filter( function ( device ) {
        return device.deviceName.toLowerCase().indexOf('oculus') !== -1;
      });

      if ( oculusDevices.length >= 1 ) {
        return devices.filter( function ( device ) {
          return device.deviceName.toLowerCase().indexOf('cardboard') === -1;
        });
      } else {
        return devices;
      }
    };

    function gotVRDevices( devices ) {
      devices = filterInvalidDevices( devices );
      for ( var i = 0; i < devices.length; i ++ ) {
        if ( devices[ i ] instanceof PositionSensorVRDevice ) {
          vrInputs.push( devices[ i ] );
        }
      };

      if ( onError ) onError( 'HMD not available' );
    }

    if ( navigator.getVRDevices ) {
      navigator.getVRDevices().then( gotVRDevices );
    }

    // the Rift SDK returns the position in meters
    // this scale factor allows the user to define how meters
    // are converted to scene units.

    this.scale = 1;

    this.update = function () {
      for ( var i = 0; i < vrInputs.length; i ++ ) {
        var vrInput = vrInputs[ i ];
        var state = vrInput.getState();
        if ( state.orientation !== null ) {
          object.quaternion.copy( state.orientation );
        }
        if ( state.position !== null ) {
          object.position.copy( state.position ).multiplyScalar( this.scale );
        }
      };
    };

    this.resetSensor = function () {
      for ( var i = 0; i < vrInputs.length; i ++ ) {
        var vrInput = vrInputs[ i ];
        if ( vrInput.resetSensor !== undefined ) {
          vrInput.resetSensor();
        } else if ( vrInput.zeroSensor !== undefined ) {
          vrInput.zeroSensor();
        }
      };
    };

    this.zeroSensor = function () {
      THREE.warn( 'THREE.VRControls: .zeroSensor() is now .resetSensor().' );
      this.resetSensor();
    };
  };

  function tick() {
    controls.update();
  };

  var controls = new THREE.VRControls(camera);

  game.on('tick', tick)
}
