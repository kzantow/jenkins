// This should be a global set of jenkins utilities in jenkins-modules or something
var $ = require('jquery-detached').getJQuery();
var wh = require('window-handle');

var baseUrl = function() {
	var u = $('head').attr('data-rooturl');
	if(!u) {
		u = '';
	}
	return u;
};

// awful hack to get around JSONifying things with Prototype taking over wrong. ugh. Prototype is the worst.
var stringify = function(o) {
	if(Array.prototype.toJSON) { // Prototype f's this up something bad
		var protoJSON = {
			a: Array.prototype.toJSON,
			o: Object.prototype.toJSON,
			h: Hash.prototype.toJSON,
			s: String.prototype.toJSON
		};
	    try {
	        delete Array.prototype.toJSON;
	    	delete Object.prototype.toJSON;
	        delete Hash.prototype.toJSON;
	        delete String.prototype.toJSON;
	        
	    	return JSON.stringify(o);
	    }
	    finally {
	    	if(protoJSON.a) {
	    		Array.prototype.toJSON = protoJSON.a;
	    	}
	    	if(protoJSON.o) {
	    		Object.prototype.toJSON = protoJSON.o;
	    	}
	    	if(protoJSON.h) {
	    		Hash.prototype.toJSON = protoJSON.h;
	    	}
	    	if(protoJSON.s) {
	    		String.prototype.toJSON = protoJSON.s;
	    	}
	    }
	}
	else {
		return JSON.stringify(o);
	}
};

/**
 * redirect
 */
exports.go = function(url) {
    wh.getWindow().location.replace(baseUrl() + url);
};

/**
 * Jenkins AJAX GET callback
 */
exports.get = function(url, success) {
	$.ajax({
		url: baseUrl() + url,
		type: 'GET',
		success: success
	});
};

/**
 * Jenkins AJAX POST callback, formats data as a JSON object post (note: works around prototype.js ugliness using stringify() above)
 */
exports.post = function(url, data, success) {
    $.ajax({
		url: baseUrl() + url,
		type: "POST",
	    data: stringify(data),
	    contentType: "application/json",
		success: success
	});
};

/**
 * simple function for defining a UI region, which has the ability to update itself.
 * usage:
 * new jenkins.part({ ... stuff })
 * new jenkins.part('template',{}) // for no backing javacsript
 */
exports.part = function() {
	var fn = arguments[0];
	var o = arguments[1];
	
	this.template = require(__dirname+'/'+fn+'.hbs');
	
	this.$parent = undefined;
	this.$handle = undefined;
	
	this.render = function() {
		var html = this.template(this);
		if(!this.$handle) {
			this.$handle = $(html);
			this.$handle.appendTo($parent);
		}
		else {
			var $newHandle = $(html);
			this.$handle.replaceWith($newHandle);
			$handle = $newHandle;
		}
	};
	
	this.attach = function($parent) {
		this.$parent = $parent;
	};
	
	// take all the things, make sure to re-bind methods
	for(var k in o) {
		var d = o[k];
		if(d instanceof Function || typeof(d) == 'function') {
			d = bind(this, d);
		}
		this[k] = d;
	}
	
	if('init' in this) { // call any initialization function present
		this.init();
	}
};

/**
 *  handlebars setup, this does not seem to actually work or get called by the require() of this file, so have to explicitly call it
 */
exports.hbs = function() {
	var Handlebars = require('handlebars');
	Handlebars.registerHelper('ifeq', function(o1, o2, options) {
		if(o1 == o2) { return options.fn(); }
	});

	Handlebars.registerHelper('ifneq', function(o1, o2, options) {
		if(o1 != o2) { return options.fn(); }
	});

	Handlebars.registerHelper('in-array', function(arr, val, options) {
		if(arr.indexOf(val) >= 0) { return options.fn(); }
	});

	Handlebars.registerHelper('id', function(str) {
		return (''+str).replace(/\W+/g, '_');
	});

	Handlebars.registerHelper('include', function() {
		var scriptName = arguments[0];
		var script = require('./'+scriptName+'.js');
		var template = require('./'+scriptName+'.hbs');
		
	});
	
	return Handlebars;
};

/**
 * simple scoping function
 */
exports.bind = function(obj, fn) {
	return function() {
		return fn.apply(obj, arguments);
	};
};
