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

// redirect
exports.go = function(url) {
    wh.getWindow().location.replace(baseUrl() + url);
};

// Jenkins ajax callback
exports.get = function(url, success) {
	$.ajax({
		url: baseUrl() + url,
		type: 'get',
		success: success
	});
};

