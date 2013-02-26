OpenVZ Wrapper NodeJS
=====================

NodeJS Wrapper for the OpenVZ CLI. This does not do a lot of error checking, so be careful. 


## Example Usage:

      var VZ = require('openvz');
      
      var onReady = function(){
      
        console.log( 'All VMs', host.containers );
        host.createContainer({ ctid:115, nameserver:'8.8.4.4' },function(e,vm){
        
            console.log('VM Created');
            vm.start(function(e){
                  console.log('VM Started');
            });
            
        });
        
      }
      
      var vzDefaults = {
        hostname  : 'container-{$VMID}.localhost',
        ipadd     : '192.168.1.{$VMID}',
        layout    : 'ploop',
        onError   : function( error ){
          console.log( 'Unexpected Error', error );
        },
        onReady   : onReady
      };
      
      var host = new VZ(vzDefaults);
