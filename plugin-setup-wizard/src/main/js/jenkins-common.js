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

// redirect
exports.go = function(url) {
    wh.getWindow().location.replace(baseUrl() + url);
};

// Jenkins ajax callback
exports.get = function(url, success) {
	$.ajax({
		url: baseUrl() + url,
		type: 'GET',
		success: success
	});
};

// Jenkins POST callback, expects data to be JSON format for our purposes.
exports.post = function(url, data, success) {
    $.ajax({
		url: baseUrl() + url,
		type: "POST",
	    data: stringify(data),
	    contentType: "application/json",
		success: success
	});
};
