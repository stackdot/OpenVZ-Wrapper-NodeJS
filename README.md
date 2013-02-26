OpenVZ Wrapper NodeJS
=====================

NodeJS Wrapper for the OpenVZ CLI. This does not do a lot of error checking, so be careful. 


## Example Usage:

      var VZ = require('openvz');
      
      var onReady = function(){
        console.log( 'All VMs', host.containers );
      }
      
      var vzDefaults = {
        hostname  : 'container-{$VMID}.localhost',
        onError   : function( error ){
          console.log( 'Unexpected Error', error );
        },
        onReady   : onReady
      };
      
      var host = new VZ(vzDefaults);
