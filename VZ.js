var fs 				= require('fs'),
	nexpect			= require('nexpect'),
	async			= require('async'),
	exec 			= require('child_process').exec,
	colors 			= require('colors'),
	Validator 		= require('validator').Validator;



/**
 * 	OpenVZ Main Wrapper Object
 * 	@constructor
 * 	@param {object|null} defaults Default values for the constructor
 */
function VZ( defaults ){ 

	/* Specify the defaults of a new VM Container */
	this.defaults = {
		nameserver		: defaults.nameserver 	|| '8.8.8.8',
		userpasswd 		: defaults.userpasswd	|| 'root:root',
		ostemplate		: defaults.ostemplate	|| 'centos-6-x86_64',
		layout			: defaults.layout		|| 'ploop',
		diskspace		: defaults.diskspace	|| '10G:10G',
		hostname		: defaults.hostname		|| 'vm{$VMID}.localhost',
		root			: defaults.root			|| '/vz/root/{$VMID}',
		private			: defaults.private		|| '/vz/private/{$VMID}',
		ipadd			: defaults.ipadd		|| '192.168.1.{$VMID}'
	};
	
	/* On error, console or call specified function */
	process.on('uncaughtException', function(err) {
		if( defaults.onError != undefined)
			defaults.onError(err);
		else
			console.error('STACKDOT ERROR',(err.stack).red);
	});
	
	/* Global Object Variables */
	this.containers 	= [];		// array of container objects
	this.updateInterval	= 5000; 	// milisecons between container refreshes
	this.interval		= null;		// variable assigned the the interval polling
	this.init( defaults.onReady );
}



/**
 * 	Intialize the OpenVZ Wrapper
 */
VZ.prototype.init = function( callback ){

	/* Grab all the containers on this Host */
	this.getContainers({},(function(){
		console.log('Total Containers: ',this.containers.length);
		callback();
	}).bind(this));
	
	/* Update containers every X seconds: */
	this.interval = setInterval( this.getContainers.bind(this), this.updateInterval );
}



/**
 *	Get the Containers on this Host Machine
 */
VZ.prototype.getContainers = function( params, callback ){

	/* vzlist all, in json format return */
	this.run('vzlist -a -j',(function( err, res ){
	
		if( err ) throw err; 
		var containers 	= JSON.parse( res );
		this.containers	= [];
		
		for(var x = 0, l = containers.length; x < l; x++){
			this.containers.push( new VZ.Container( containers[x], this) );
		}
		
		if(typeof callback == 'function')
			callback( this.containers );
			
	}).bind(this));
	
}



/**
 * 	Create a new VM Container 
 * 	@param {object|null} params What params to start this container with, 
 * 		additional params will be set on creation.
 *	@param {function|null} callback callback when VM is created.
 */
VZ.prototype.createContainer = function( params, callback ){

	/* Create a validator object for this: */
	var v = new Validator(); 
	
	/* Set Container Attributes */
	var container = {
		nameserver		: params.nameserver || this.defaults.nameserver.replace(/\{\$VMID\}/g, params.ctid),
		userpasswd		: params.userpasswd	|| this.defaults.userpasswd.replace(/\{\$VMID\}/g, params.ctid),
		ostemplate		: params.ostemplate	|| this.defaults.ostemplate.replace(/\{\$VMID\}/g, params.ctid),
		layout			: params.layout		|| this.defaults.layout.replace(/\{\$VMID\}/g, params.ctid),
		hostname		: params.hostname	|| this.defaults.hostname.replace(/\{\$VMID\}/g, params.ctid),
		root			: params.root		|| this.defaults.root.replace(/\{\$VMID\}/g, params.ctid),
		private			: params.private	|| this.defaults.private.replace(/\{\$VMID\}/g, params.ctid),
		diskspace		: params.diskspace	|| this.defaults.diskspace.replace(/\{\$VMID\}/g, params.ctid),
		ipadd			: params.ipadd		|| this.defaults.ipadd.replace(/\{\$VMID\}/g, params.ctid),
		ctid			: params.ctid
	};
	
	/* Check some of the fields */
	v.check(container.ctid,'CTID must be numeric and > 100').isNumeric().min(100);
	v.check(container.ipadd,'Please enter a valid IP Address (IPv4)').isIPv4();
	v.check(container.nameserver,'Nameserver must be a valid IP (IPv4)').isIPv4();
	v.check(container.layout,'Layout must be simfs or ploop').isIn(['ploop','simfs']);
 
	/* If there are errors, callback with errors, dont continue */
	if(v.getErrors().length > 0){
		callback(v.getErrors(),null);
		return;
	}
	
	/* Add any additional, not standard attributes */
	for(attr in params){
		if( container[attr] == undefined )
			container[attr] = params[attr];
	}
	
	/* Create the VM */
	var vm = new VZ.Container( container, this );
	vm.create((function(e,r){
		this.getContainers();
		callback(e,vm);
	}).bind(this));
	
}



/**
 *	Format an object to a vz standard command string 
 */
VZ.prototype.formatString = function( params ){
	var str = '';
	for(attr in params){
		if(attr == 'save')
			str += ' --'+attr;
		else
			str += ' --'+attr+' '+params[attr];
	}
	return str;
}



/**
 *	All commands should run through here
 */
VZ.prototype.run = function( cmd, callback ){
	exec(cmd,function(error, stdout, stderr){
		if( typeof callback == 'function')
			callback( error, stdout );
	});
}



/**
 *	Get a container object by its CTID 
 */
VZ.prototype.getContainerByCTID = function( CTID ){
	for(var x = 0, l = this.containers.length; x < l; x++){
		if(CTID === this.containers[x].data.ctid)
			return this.containers[x];
	}
	return false;
}



/**
 *	Get the array key of a container by its CTID 
 */
VZ.prototype.getKeyOfCTID = function( CTID ){
	for(var x = 0, l = this.containers.length; x < l; x++){
		if(CTID === this.containers[x].data.ctid)
			return x;
	}
	return false;
}



/**
 *	Remove a container from the this.containers object
 */
VZ.prototype.removeContainerFromArray = function( CTID ){
	var i = this.getKeyOfCTID( CTID );
	this.containers.splice(i,1);
	return this;
}



/**
 *	Destroy a VM Container
 */
VZ.prototype.destroyContainer = function( CTID, callback ){
	var container = this.getContainerByCTID( CTID );
	if(!container)
		callback('Container Does Not Exist',null);
	else
		container.destroy(callback);
}









/* Include Sub Modules */
VZ.Container = require('./VZ.Container.js').app; 

/* Validator extended functionality: */
Validator.prototype.error = function (msg) {
    this._errors.push(msg);
    return this;
} 
Validator.prototype.getErrors = function () {
    return this._errors;
}

/* Export it */
exports.app = VZ;