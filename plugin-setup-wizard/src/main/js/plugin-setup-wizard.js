// Initialise all modules by requiring them. Also makes sure they get bundled (see gulpfile.js).
var $ = require('jquery-detached').getJQuery();
var $bs = require('bootstrap-detached').getBootstrap();

// templates
var dialog = require('./dialog.hbs');

var createFirstRunDialog = function() {
	$('.plugin-setup-wizard').append(dialog);
	$bs('.plugin-setup-wizard > .modal').modal({
		show: true,
		backdrop: 'static'
	});
};



// go!
if('isTest' in global) {
	createFirstRunDialog();
}
else {
	$(function() {
		createFirstRunDialog();
	});
}
