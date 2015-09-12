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
		var append = function() {
			$wizard.attr('data-panel', panel.name);
			$container.append(panel);
		};
		
		var $modalBody = $container.find('.modal-body');
		if($modalBody.length > 0) {
			$modalBody.fadeOut(250, function() {
				$container.children().remove();
				append();
			});
		}
		else {
			$container.children().remove();
			append();
		}
	};

	var installPlugins = function(plugins) {
		jenkins.get('/pluginManager/install?dynamicLoad=true&' + plugins.map(function(v){ return 'plugin.'+v+'=true'; }).join('&'));
		showInstallProgress();
	};
	
	var installRecommendedPlugins = function() {
		installPlugins(['workflow-aggregator','github']);
	};
	
	// Define actions
	var showInstallProgress = function() {
		setPanel(progressPanel);
	
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
						if(jobs[i].status.success) {
							complete++;
						}
					}
				}
				
				$('.progress-bar').css({width: ((100.0 * complete)/total) + '%'});
				
				if(complete < total) {
					// wait a sec
					setTimeout(updateStatus, 1000);
				}
				else {
					jenkins.get('/saveLastExecVersion');
					jenkins.go('/');
				}
			});
		};
		
		// kick it off
		updateStatus();
	};
	
	// check for updates when first loaded...
	jenkins.get('/updateCenter/api/json?tree=jobs[name,status[*]]', function(data) {
		if(data.jobs.length > 0) {
			showInstallProgress();
		}
	});
	
	// Functions for custom plugin selection
	var installCustomPlugins = function() {
		jenkins.get('/updateCenter/api/json?tree=categorizedAvailables[*,*[*]]', function(data) {
			setPanel(pluginSelectionPanel({ plugins: data.categorizedAvailables }));
		});
	};
	
	var actions = {
		'.install-recommended': installRecommendedPlugins,
		'.install-custom': installCustomPlugins,
		'.install-home': function() { setPanel(welcomePanel); }
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
	
	// by default, we'll show the welcome screen
	setPanel(welcomePanel);
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
