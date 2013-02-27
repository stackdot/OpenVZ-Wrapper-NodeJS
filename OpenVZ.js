// Generated by CoffeeScript 1.5.0
(function() {
  var Container, OpenVZ, Validator, async, colors, exec, fs, nexpect,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  fs = require('fs');

  nexpect = require('nexpect');

  async = require('async');

  exec = require('child_process').exec;

  colors = require('colors');

  Validator = require('validator').Validator;

  OpenVZ = (function() {

    function OpenVZ(params) {
      this.params = params != null ? params : {};
      this.createContainer = __bind(this.createContainer, this);
      this.getContainerByCTID = __bind(this.getContainerByCTID, this);
      this.run = __bind(this.run, this);
      this.getContainers = __bind(this.getContainers, this);
      this.getVMDefault = __bind(this.getVMDefault, this);
      this.containers = [];
      this.updateInterval = 10000;
      this.interval = null;
      this.defaults = {
        ipadd: this.params.ipAdd || '192.168.1.${VMID}',
        nameserver: this.params.nameserver || '8.8.8.8',
        userpasswd: this.params.userpasswd || 'root:root',
        ostemplate: this.params.ostemplate || 'centos-6-x86_64',
        layout: this.params.layout || 'ploop',
        diskspace: this.params.diskspace || '10G:10G',
        hostname: this.params.hostname || 'vm${VMID}.localhost',
        root: this.params.root || '/vz/root/${VMID}',
        "private": this.params["private"] || '/vz/private/${VMID}'
      };
      this.getContainers(params.onReady);
      this.interval = setInterval(this.getContainers, this.updateInterval);
    }

    OpenVZ.prototype.getVMDefault = function(attr, ctid) {
      return this.defaults[attr].replace(/\$\{VMID\}/g, ctid);
    };

    OpenVZ.prototype.getContainers = function(cb) {
      var _this = this;
      return this.run('vzlist -a -j', function(err, res) {
        var container, _containers, _i, _len;
        _containers = JSON.parse(res);
        for (_i = 0, _len = _containers.length; _i < _len; _i++) {
          container = _containers[_i];
          _this.containers.push(new Container(container));
        }
        return typeof cb === "function" ? cb(err, _this.containers) : void 0;
      });
    };

    OpenVZ.prototype.run = function(cmd, cb) {
      return exec(cmd, function(error, stdout, stderr) {
        return typeof cb === "function" ? cb(error, stdout) : void 0;
      });
    };

    OpenVZ.prototype.formatString = function(attrs) {
      var attr, str, value;
      str = (function() {
        var _results;
        _results = [];
        for (attr in attrs) {
          value = attrs[attr];
          if (attr !== 'save') {
            _results.push("--" + attr + " " + value + " ");
          } else {
            _results.push("--" + attr + " ");
          }
        }
        return _results;
      })();
      return str.join(' ');
    };

    OpenVZ.prototype.getContainerByCTID = function(CTID) {
      var container, _i, _len, _ref;
      _ref = this.containers;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        container = _ref[_i];
        if (container.data.ctid === CTID) {
          return container;
        }
      }
    };

    OpenVZ.prototype.createContainer = function(options, cb) {
      var container, key, v, value, vm, _ref, _ref1,
        _this = this;
      if (options == null) {
        options = {};
      }
      v = new Validator;
      container = {
        ctid: options.ctid
      };
      for (key in options) {
        value = options[key];
        if (key !== 'ctid') {
          container[key] = value;
        }
      }
      _ref = this.defaults;
      for (key in _ref) {
        value = _ref[key];
        container[key] = ((_ref1 = options[key]) != null ? _ref1.replace(/\$\{VMID\}/g, options.ctid) : void 0) || this.getVMDefault(key, options.ctid);
      }
      v.check(container.ctid, 'CTID must be numeric and > 100').isNumeric().min(100);
      v.check(container.ipadd, 'Please enter a valid IP Address (IPv4)').isIPv4();
      v.check(container.nameserver, 'Nameserver must be a valid IP (IPv4)').isIPv4();
      v.check(container.layout, 'Layout must be simfs or ploop').isIn(['ploop', 'simfs']);
      if (v.getErrors().length > 0) {
        cb(v.getErrors());
      }
      vm = new Container(container);
      return vm.create(function(e, res) {
        _this.containers.push(vm);
        return typeof cb === "function" ? cb(e, vm) : void 0;
      });
    };

    return OpenVZ;

  })();

  Container = (function(_super) {

    __extends(Container, _super);

    function Container(data) {
      this.data = data;
      this.restore = __bind(this.restore, this);
      this.suspend = __bind(this.suspend, this);
      this.destroy = __bind(this.destroy, this);
      this.stop = __bind(this.stop, this);
      this.start = __bind(this.start, this);
      this.run = __bind(this.run, this);
      this.getAttrs = __bind(this.getAttrs, this);
      this.setAll = __bind(this.setAll, this);
      this.create = __bind(this.create, this);
    }

    Container.prototype.create = function(cb) {
      return this.run('create', this.getAttrs(['ipadd', 'root', 'private', 'hostname', 'layout', 'ostemplate', 'diskspace']), cb);
    };

    Container.prototype.setAll = function(cb) {
      var attrs;
      attrs = this.getAttrs(['nameserver', 'userpasswd', 'onboot', 'cpuunits', 'ram']);
      attrs.save = true;
      return this.run('set', attrs, cb);
    };

    Container.prototype.getAttrs = function(attrs) {
      var attr, obj, _i, _len;
      obj = {};
      for (_i = 0, _len = attrs.length; _i < _len; _i++) {
        attr = attrs[_i];
        if (this.data[attr] != null) {
          obj[attr] = this.data[attr];
        }
      }
      return obj;
    };

    Container.prototype.run = function(cmd, attrs, cb) {
      var cmdStr;
      if (attrs instanceof Function) {
        cb = attrs;
        attrs = {};
      }
      cmdStr = ("vzctl " + cmd + " " + this.data.ctid + " ") + this.formatString(attrs);
      console.log(cmdStr);
      return Container.__super__.run.call(this, cmdStr, cb);
    };

    Container.prototype.start = function(cb) {
      return this.run('start', cb);
    };

    Container.prototype.stop = function(cb) {
      return this.run('stop', cb);
    };

    Container.prototype.destroy = function(cb) {
      return this.run('destroy', cb);
    };

    Container.prototype.suspend = function(dumpFile, cb) {
      return this.run('suspend', {
        dumpfile: dumpFile
      }, cb);
    };

    Container.prototype.restore = function(dumpFile, cb) {
      return this.run('restore', {
        dumpfile: dumpFile
      }, cb);
    };

    return Container;

  })(OpenVZ);

  Validator.prototype.error = function(msg) {
    this._errors.push(msg);
    return this;
  };

  Validator.prototype.getErrors = function() {
    return this._errors;
  };

  module.exports = OpenVZ;

}).call(this);