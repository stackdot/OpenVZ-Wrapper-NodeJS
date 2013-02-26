OpenVZ Wrapper NodeJS
=====================

NodeJS Wrapper for the OpenVZ CLI. This does not do a lot of error checking, so be careful. 

## To Install:

      npm install openvz

## Default Configs:

      nameserver		: '8.8.8.8',
      userpasswd 		: 'root:root',
      ostemplate		: 'centos-6-x86_64',
      layout		: 'ploop',
      diskspace		: '10G:10G',
      hostname		: 'vm{$VMID}.localhost',
      root			: '/vz/root/{$VMID}',
      private		: '/vz/private/{$VMID}',
      ipadd			: '192.168.1.{$VMID}'
      
to change a default attribute, pass it into the constructor:
      var vz = new VZ({ layout:'simfs' });

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
      
      
## Running Container Specific Commands:

      var vm = host.getContainerByCTID( 115 );
      
      // To Stop:
      vm.stop();
      
      // To Start:
      vm.start();
      
      // To Restart:
      vm.restart();
      
      // Run a custom command:
      vm.run('set',{ cpuunits:1000, diskspace:'10G:10G', save:true });
            // would run: vzctl set 115 --cpuunits 1000 --diskspace '10G:10G' --save




