// Initialize all modules by requiring them. Also makes sure they get bundled (see gulpfile.js).
var $ = require('jquery-detached').getJQuery();
var $bs = require('bootstrap-detached').getBootstrap();
var jenkins = require('./jenkins-common');

if(!('jQueryzz' in window)) {	
	window.jQueryzz = $;
}

// Include handlebars templates here
var pluginSelectionContainer = require('./pluginSelectionContainer.hbs');
var welcomePanel = require('./welcomePanel.hbs');
var progressPanel = require('./progressPanel.hbs');
var pluginSelectionPanel = require('./pluginSelectionPanel.hbs');
var dialog = require('./dialog.hbs');

// Setup the dialog
var createFirstRunDialog = function() {
	var $wizard = $('.plugin-setup-wizard');
	$wizard.append(dialog);
	var $container = $wizard.find('.modal-content');
	
	var setPanel = function(panel) {
//		$container.children().fadeOut(function() {
			$container.children().remove();
			$wizard.attr('data-panel', panel.name);
			$container.append(panel);
//		});
	};

	setPanel(welcomePanel);
	
	// Define actions
	var showInstallProgress = function() {
		setPanel(progressPanel);
		
		var plugins = ['workflow-aggregator','github'];
		// /jenkins/pluginManager/install?plugin.workflow-aggregator=true&plugin.github=true&dynamicLoad=true
		jenkins.get('/pluginManager/install?dynamicLoad=true' + plugins.map(function(v){ return '&plugin.'+v+'=true'; }), function(data) {
			// update center for status -- replace this with something cooler
			//jenkins.go('/updateCenter');
			var updateStatus = function() {
				jenkins.get('/updateCenter/api/json?tree=jobs[name,status[*]]', function(data) {
					var complete = 0;
					var total = 0;
					var jobs = data.jobs;
					for(var i = 0; i < jobs.length; i++) {
						if('name' in jobs[i]) {
							total++;
							if(/.*Success.*/.test(jobs[i].status.type)) {
								complete++;
							}
						}
					}
					
					$('.progress-bar').css({width: ((100.*complete)/total) + '%'});
					
					if(complete < total) {
						setTimeout(updateStatus, 500);
					}
					else {
						jenkins.get('/saveLastExecVersion');
						jenkins.go('/updateCenter');
					}
				});
			};
			
			setTimeout(updateStatus, 500);
		});
	};
	
	// check for updates
	jenkins.get('/updateCenter/api/json?tree=jobs[name,status[*]]', function(data) {
		if(data.jobs.length > 0) {
			showInstallProgress();
		}
	});
	
	var actions = {
		'.install-recommended': showInstallProgress,
		'.install-custom': function() {
			setPanel(pluginSelectionPanel);
			var plugins = ['workflow-aggregator','github'];
			// /jenkins/pluginManager/install?plugin.workflow-aggregator=true&plugin.github=true&dynamicLoad=true
			jenkins.get('/updateCenter/api/json?tree=availables[*]', function(data) {
				setPanel(pluginSelectionPanel(data));
			});
		}
	};
	
	var bindWizardHandler = function(cls, action) {
		$wizard.on('click', cls, function(e) {
			action(e);
			e.preventDefault();
		});
	};
	
	for(var cls in actions) {
		bindWizardHandler(cls, actions[cls]);
	}
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
