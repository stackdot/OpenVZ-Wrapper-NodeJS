var VZ 		= VZ || function(){};



/**
 * 	Main Container object for containers on this host machine
 * 	@constructor
 *	@param {object} data This containers data.
 *	@param {object} super The parent objects context.
 */
VZ.Container = function( data, _super ){
	this.data	= data;
	this._super	= _super;
}



/**
 *	Get the up to date stats for this container
 */
VZ.Container.prototype.stats = function(){
	
}



/**
 *	Get the attributes from the container
 *	@param {Array} attrs Array of attributes you would like to get
 */
VZ.Container.prototype.getAttrs = function( attrs ){
	var obj = {}; 
	for(var x = 0, l = attrs.length; x < l; x++){
		if( this.data[attrs[x]] != undefined)
			obj[attrs[x]] = this.data[attrs[x]];
	} 
	return obj;
}



/**
 *	Create this VM based on the set paramaters
 */
VZ.Container.prototype.create = function( callback ){
	var attrs = ['ipadd','root','private','hostname','layout','ostemplate','diskspace'];
	this.run('create', this.getAttrs( attrs ), (function(e,r){
		if(e){
			callback(e,null);
			return;
		}
		this.setAll(callback);
	}).bind(this));
}



/**
 *	Destroy this container from the host machine
 */
VZ.Container.prototype.destroy = function( callback ){
	this.run('stop',(function(){
		this.run('destroy',(function(err,res){
			if(err){
				callback( err, null );
				return;
			}
			this._super.removeContainerFromArray( this.data.ctid );
			callback( err, res );
		}).bind(this));
	}).bind(this));
}



/**
 *	Set all the options of this container, and save it.
 */
VZ.Container.prototype.setAll = function( callback ){ 
	var attrs = this.getAttrs( ['nameserver','userpasswd','onboot','cpuunits','ram'] );
		attrs.save = true;
	this.run('set', attrs, callback );
}



/**
 *	Some Standard VM Operations:
 */
VZ.Container.prototype.start = function( callback ){
		this.run( 'start', callback ); 
	}
	VZ.Container.prototype.restart = function( dumpLocation, callback ){
		this.run( 'restart', callback );
	}
	VZ.Container.prototype.stop = function( callback ){
		this.run( 'stop', callback);
}



/**
 *	Suspend this container in time
 *	@param {string} dumpLocation Where to dumb the state of this container to:
 */
VZ.Container.prototype.suspend = function( dumpLocation, callback ){
	this.run( 'suspend', { dumpfile: dumpLocation }, callback );
}



/**
 *	Run a specific command on the VM
 *	@param {object} attrs Object of key:value's to run in the string
 */
VZ.Container.prototype.run = function( func, attrs, callback ){
	if(typeof attrs == 'function'){
		callback = attrs; attrs = {};
	}
	var cmd = 'vzctl '+func+' '+this.data.ctid+' ';
	if(Object.keys(attrs).length > 0)
		cmd += this._super.formatString(attrs);
	this._super.run(cmd,callback);
}



/**
 *	Restore this container in time
 *	@param {string} dumpLocation Where to restore the state of this container from
 */
VZ.Container.prototype.restore = function( dumpLocation, callback ){
	this.run( 'restore', { dumpfile:dumpLocation }, callback );
} 



/* Export it */
exports.app = VZ.Container;