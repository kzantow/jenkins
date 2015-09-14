// Initialize all modules by requiring them. Also makes sure they get bundled (see gulpfile.js).
var $ = require('jquery-detached').getJQuery();
var $bs = require('bootstrap-detached').getBootstrap();
var wh = require('window-handle');
var jenkins = require('./jenkins-common');

var recommendedPlugins = ['workflow-aggregator','github'];

if(!('zq' in window)) {
	window.zq = $;
}

// Include handlebars templates here - explicitly require them needed for hbsfy?
var pluginSelectionContainer = require('./pluginSelectionContainer.hbs');
var welcomePanel = require('./welcomePanel.hbs');
var progressPanel = require('./progressPanel.hbs');
var pluginSelectionPanel = require('./pluginSelectionPanel.hbs');
var successPanel = require('./successPanel.hbs');
var connectivityIssuePanel = require('./connectivityIssuePanel.hbs');
var dialog = require('./dialog.hbs');

var Handlebars = require('handlebars');
Handlebars.registerHelper('ifeq', function(o1, o2, options) {
	if(o1 == o2) { return options.fn(); }
});

Handlebars.registerHelper('ifneq', function(o1, o2, options) {
	if(o1 != o2) { return options.fn(); }
});

Handlebars.registerHelper('in', function(arr, val, options) {
	if(arr.indexOf(val) >= 0) { return options.fn(); }
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
			jenkins.get('/updateCenter/api/json?tree=jobs[name,status[*],errorMessage]', function(data) {
				var i, j;
				var complete = 0;
				var total = 0;
				var jobs = data.jobs;
				for(i = 0; i < jobs.length; i++) {
					j = jobs[i];
					if('status' in j) {
						total++;
						if(/.*Success.*/.test(j.status.type)||/.*Fail.*/.test(j.status.type)) { //jobs[i].status.success) {
							complete++;
						}
					}
				}
				
				$('.progress-bar').css({width: ((100.0 * complete)/total) + '%'});
				
				var $c = $('.install-console');
				{
					$c = $('.install-text');
					$c.children().remove();
					for(i = 0; i < jobs.length; i++) {
						j = jobs[i];
						if('status' in j) {
							if(/.*Success.*/.test(j.status.type)) {
								$c.append('<div>'+j.name+'</div>');
							}
							else if(/.*Install.*/.test(j.status.type)) {
								$c.append('<div>'+j.name+'</div>');
							}
							else if(/.*Fail.*/.test(j.status.type)) {
								$c.append('<div>'+j.name+' -- '+j.errorMessage+'</div>');
							}
						}
					}
					if($c.is(':visible')) {
						$c[0].scrollTop = $c[0].scrollHeight;
					}
				}
				
				if(total === 0 || complete < total) {
					// wait a sec
					setTimeout(updateStatus, 250);
				}
				else {
					$('.progress-bar').css({width: '100%'});
					jenkins.get('/saveLastExecVersion');
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
		jenkins.get('/saveLastExecVersion');
		jenkins.go('/');
	};
	
	var selectedCategory;
	var categorizedPlugins = {};
	var availablePlugins = [];
	var selectedPlugins = recommendedPlugins.slice(0); // default to recommended plugins
	
	// Functions for custom plugin selection
	var selectCategory = function(category) {
		selectedCategory = category;
		setPanel(pluginSelectionPanel, {
			categorized: categorizedPlugins,
			available: availablePlugins,
			selectedCategory: selectedCategory,
			selectedCategoryPlugins: categorizedPlugins[selectedCategory],
			selectedPlugins: selectedPlugins,
			selectedPluginsText: selectedPlugins.join(', ')
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
	

	var remove = function(arr, item) {
		for (var i = arr.length; i--;) {
			if (arr[i] === item) {
				arr.splice(i, 1);
			}
		}
	};
	var add = function(arr, item) {
		arr.push(item);
	};
	$(document).on('change', '.plugins input[type=checkbox]', function() {
		var $input = $(this);
		if($input.is(':checked')) {
			add(selectedPlugins, $input.attr('name'));
		}
		else {
			remove(selectedPlugins, $input.attr('name'));
		}
	});
	
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
		'.select-category': function() { selectCategory($(this).text()); },
		'.toggle-install-details': toggleInstallDetails,
		'.install-done': finishInstallation,
		'.remove-plugin': function() { console.log('remove: ' + $(this).attr('data-name')); remove(selectedPlugins, $(this).attr('data-name')); $(this).parent().remove(); }
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
	
	var testConnectivity = function() {
		jenkins.get('/updateCenter/connectionStatus?siteId=default', function(response) {
			var uncheckedStatuses = ['CHECKING', 'UNCHECKED'];
			if(uncheckedStatuses.indexOf(response.data.updatesite) >= 0  || uncheckedStatuses.indexOf(response.data.internet) >= 0) {
				setTimeout(testConnectivity, 500);
			}
			else {
				if(response.status != 'ok' || response.data.updatesite != 'OK' || response.data.internet != 'OK') {
					setPanel(connectivityIssuePanel);
				}
			}
		});
	};
	testConnectivity();
	
	// check for updates when first loaded...
	jenkins.get('/updateCenter/api/json?tree=jobs[name,type,status[*]]', function(data) {
		// check for install jobs
		for(var i = 0; i < data.jobs.length; i++) {
			if(data.jobs[i].type != 'ConnectionCheckJob') {
				showInstallProgress();
				break;
			}
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
