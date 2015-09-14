// Initialize all modules by requiring them. Also makes sure they get bundled (see gulpfile.js).
var $ = require('jquery-detached').getJQuery();
var $bs = require('bootstrap-detached').getBootstrap();
var wh = require('window-handle');
var jenkins = require('./jenkins-common');

var recommendedPlugins = ['git', 'workflow-aggregator','github'];

if(!('zq' in window)) {
	window.zq = $;
}

// Include handlebars templates here
var pluginSelectionContainer = require('./pluginSelectionContainer.hbs');
var welcomePanel = require('./welcomePanel.hbs');
var progressPanel = require('./progressPanel.hbs');
var pluginSelectionPanel = require('./pluginSelectionPanel.hbs');
var successPanel = require('./successPanel.hbs');
var dialog = require('./dialog.hbs');

var Handlebars = require('handlebars');
Handlebars.registerHelper('ifeq', function(o1, o2, options) {
	if(o1 == o2) { return options.fn(); }
});
Handlebars.registerHelper('ifneq', function(o1, o2, options) {
	if(o1 != o2) { return options.fn(); }
});

// Setup the dialog
var createFirstRunDialog = function() {
	var $wizard = $('<div class="plugin-setup-wizard bootstrap-3"></div>');
	$wizard.appendTo('body');
	$wizard.append(dialog);
	var $container = $wizard.find('.modal-content');
	
	var setPanel = function(panel, data) {
		var append = function() {
			$wizard.attr('data-panel', panel.name);
			$container.append(panel(data));
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
		installPlugins(recommendedPlugins);
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
					var j = jobs[i];
					if('status' in j) {
						total++;
						if(/.*Success.*/.test(j.status.type)) { //jobs[i].status.success) {
							complete++;
						}
					}
				}
				
				$('.progress-bar').css({width: ((100.0 * complete)/total) + '%'});
				
				var $c = $('.install-console');
				if($c.is(':visible')) {
					$c = $('.install-text');
					$c.children().remove();
					for(var i = 0; i < jobs.length; i++) {
						var j = jobs[i];
						if('status' in j) {
							if(/.*Success.*/.test(j.status.type)) {
								$c.append('<div>'+j.name+'</div>');
							}
							else if(/.*Install.*/.test(j.status.type)) {
								$c.append('<div>'+j.name+'</div>');
							}
						}
					}
					$c[0].scrollTop = $c[0].scrollHeight;
				}
				
				if(total === 0 || complete < total) {
					// wait a sec
					setTimeout(updateStatus, 250);
				}
				else {
					$('.progress-bar').css({width: '100%'});
					//jenkins.get('/saveLastExecVersion');
					setPanel(successPanel);
				}
			});
		};
		
		// kick it off
		setTimeout(updateStatus, 250);
	};
	
	/**
	 * Called to complete the installation
	 */
	var finishInstallation = function() {
		//jenkins.get('/saveLastExecVersion');
		jenkins.go('/');
	};
	
	var selectedCategory;
	var categorizedPlugins = {};
	var availablePlugins = [];
	var selectedPlugins = [];
	
	// Functions for custom plugin selection
	var selectCategory = function(category) {
		selectedCategory = category;
		setPanel(pluginSelectionPanel, {
			categorized: categorizedPlugins,
			available: availablePlugins,
			selectedCategory: selectedCategory,
			selectedCategoryPlugins: categorizedPlugins[selectedCategory],
			selectedPlugins: selectedPlugins
		});
	};
	
	var loadCustomPlugins = function() {
		jenkins.get('/updateCenter/api/json?tree=categorizedAvailables[*,*[*]]', function(data) {
			availablePlugins = data.categorizedAvailables;
			for(var i = 0; i < availablePlugins.length; i++) {
				var plug = availablePlugins[i];
				var plugs = categorizedPlugins[plug.category];
				if(!plugs) {
					categorizedPlugins[plug.category] = plugs = [];
				}
				plugs.push(plug);
			}
			setPanel(pluginSelectionPanel, {
				categorized: categorizedPlugins,
				available: availablePlugins
			});
		});
	};
	
	
	var toggleInstallDetails = function() {
		var $c = $('.install-console');
		if($c.is(':visible')) {
			$c.slideUp();
		}
		else {
			$c.slideDown();
		}
	};
	
	var actions = {
		'.install-recommended': installRecommendedPlugins,
		'.install-custom': loadCustomPlugins,
		'.install-home': function() { setPanel(welcomePanel); },
		'.install-selected': function() { installPlugins(selectedPlugins); },
		'.plugin-selector .categories > div': function() { selectCategory($(this).text()); },
		'.toggle-install-details': toggleInstallDetails,
		'.install-done': finishInstallation
	};
	
	var bindClickHandler = function(cls, action) {
		$wizard.on('click', cls, function(e) {
			action.apply(this, arguments);
			e.preventDefault();
		});
	};
	
	for(var cls in actions) {
		bindClickHandler(cls, actions[cls]);
	}
	
	// by default, we'll show the welcome screen
	setPanel(welcomePanel);
	
	// check for updates when first loaded...
	jenkins.get('/updateCenter/api/json?tree=jobs[name,status[*]]', function(data) {
		if(data.jobs.length > 0) {
			showInstallProgress();
		}
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
