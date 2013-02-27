fs				= require('fs')
nexpect			= require('nexpect')
async			= require('async')
exec 			= require('child_process').exec
colors 			= require('colors')
Validator 		= require('validator').Validator










class OpenVZ

	constructor: (@params = {}) ->
		@containers		= [];
		@updateInterval	= 10000;
		@interval		= null;
		@defaults = 
			ipadd 			: @params.ipAdd 		|| '192.168.1.${VMID}'
			nameserver		: @params.nameserver 	|| '8.8.8.8'
			userpasswd		: @params.userpasswd 	|| 'root:root'
			ostemplate		: @params.ostemplate 	|| 'centos-6-x86_64'
			layout			: @params.layout 		|| 'ploop'
			diskspace		: @params.diskspace 	|| '10G:10G'
			hostname		: @params.hostname 		|| 'vm${VMID}.localhost'
			root			: @params.root 			|| '/vz/root/${VMID}'
			private			: @params.private 		|| '/vz/private/${VMID}'
		
		@getContainers()
		@interval = setInterval @getContainers, @updateInterval
	
	getVMDefault: ( attr, ctid )=> @defaults[attr].replace /\$\{VMID\}/g, ctid
	
	getContainers: ( cb ) =>
		@run 'vzlist -a -j', (err,res)=>
			_containers = JSON.parse res
			for container in _containers
				@containers.push new Container container
			cb? err, @containers
	
	
	run: ( cmd , cb) =>
		exec cmd, (error, stdout, stderr)->
			cb? error, stdout
			
			
	formatString: ( attrs )->
		str = for attr, value of attrs
			if attr isnt 'save' then "--#{attr} #{value} "
			else "--#{attr} "
		str.join ' '
	
	
	getContainerByCTID: ( CTID ) =>
		for container in @containers
			return container if container.data.ctid is CTID;
	
	createContainer: ( options = {}, cb )=>
		v = new Validator
		container = 
			ctid : options.ctid
			
		for key, value of options
			if key isnt 'ctid' then container[key] = value 
			
		for key, value of @defaults
			container[key] = options[key]?.replace(/\$\{VMID\}/g, options.ctid) || @getVMDefault key,options.ctid

		v.check(container.ctid,'CTID must be numeric and > 100').isNumeric().min(100);
		v.check(container.ipadd,'Please enter a valid IP Address (IPv4)').isIPv4();
		v.check(container.nameserver,'Nameserver must be a valid IP (IPv4)').isIPv4();
		v.check(container.layout,'Layout must be simfs or ploop').isIn(['ploop','simfs']);
	
		if v.getErrors().length > 0
			cb v.getErrors()
		
		vm = new Container container
		vm.create (e,res)=>
			@containers.push vm
			cb?(e,res)
		















		
class Container extends OpenVZ
	
	constructor: ( @data ) ->

	create: ( cb )=> @run 'create', @getAttrs(['ipadd','root','private','hostname','layout','ostemplate','diskspace']), cb
	
	setAll: ( cb )=>
		attrs = @getAttrs(['nameserver','userpasswd','onboot','cpuunits','ram'])
		attrs.save = true 
		@run 'set', attrs, cb
		
	getAttrs: ( attrs )=>
		obj = {}; 
		for attr in attrs
			if @data[attr]?
				obj[attr] = @data[attr]
		return obj

	## Run a command on this VM ##
	run: ( cmd, attrs, cb )=>
		if attr? 
			cb = attrs
			attrs = {}
			
		cmdStr = "vzctl #{cmd} #{@data.ctid} "+@formatString attrs
		super cmdStr, cb

	## Basic Methods ##
	start: ( cb )=> @run 'start',cb
	stop: ( cb )=> @run 'stop',cb
	destroy: ( cb )=> @run 'destroy',cb
	
	## Stop and Go ##
	suspend: ( dumpFile, cb )=> @run 'suspend', dumpfile:dumpFile, cb
	restore: ( dumpFile, cb )=> @run 'restore', dumpfile:dumpFile, cb










Validator.prototype.error = (msg)->
	@_errors.push msg
	return this
Validator.prototype.getErrors = ()->
    @._errors
		
vz = new OpenVZ
vz.createContainer { ctid:110, ipadd:'8.8.8.${VMID}', cpuunits:900 }, (err,res)->
	console.log err,res
	
exports.app = OpenVZ