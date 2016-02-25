/**
 * Provides a wrapper to interact with the security configuration
 */

var jenkins = require('../util/jenkins');
var jquery = require('jquery-detached');
var wh = require('window-handle');

// gets the window containing a form, taking in to account top-level iframes
var getWindow = function($form) {
	var $ = jquery.getJQuery();
	var wnd = wh.getWindow();
	$(top.document).find('iframe').each(function() {
		var windowFrame = this.contentWindow;
		var $f = $(this).contents().find('form');
		if($f.length > 0 && $form[0] === $f[0]) {
			wnd = windowFrame;
		}
	});
	return wnd;
};

var buildFormPost = function($form) {
	var wnd = getWindow($form);
	var form = $form[0];
	if(wnd.buildFormTree(form)) {
		return $form.serialize() +
			'&core:apply=&Submit=Save&json=' + $form.find('input[name=json]').val();
	}
	return '';
};

var getFormCrumb = function($form) {
	var wnd = getWindow($form);
	return wnd.crumb;
};

/**
 * Calls a stapler post method to save security settings; returns
 * { requiresLocalUser: true } if the user should configure
 * a local admin user next
 */
exports.saveSecurity = function($form, success, error) {
	var postBody = buildFormPost($form);
	var crumb = getFormCrumb($form);
	jenkins.post(
		'/configureSecurity/configureJson',
		postBody,
		success, {
			dataType: 'json',
			processData: false,
			contentType: 'application/x-www-form-urlencoded',
			crumb: crumb,
			error: function() {
				error();
			}
		});
};

/**
 * Calls a stapler post method to save the first user settings
 */
exports.saveFirstUser = function($form, success, error) {
	var postBody = buildFormPost($form);
	var crumb = getFormCrumb($form);
	jenkins.post(
		'/securityRealm/createFirstAccount',
		postBody,
		success, {
			dataType: 'html',
			processData: false,
			contentType: 'application/x-www-form-urlencoded',
			crumb: crumb,
			error: function() {
				error();
			}
		});
};
