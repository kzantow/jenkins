// Initialize all modules by requiring them. Also makes sure they get bundled (see gulpfile.js).
var $ = require('jquery-detached').getJQuery();
var $bs = require('bootstrap-detached').getBootstrap();
var wh = require('window-handle');
var jenkins = require('./util/jenkins');

var Handlebars = jenkins.initHandlebars();

Handlebars.registerHelper('pluginCount', function(cat) {
	var plugs = categorizedPlugins[cat];
	var tot = 0;
	var cnt = 0;
	for(var i = 0; i < plugs.length; i++) {
		var plug = plugs[i];
		if(plug.category == cat) {
			tot++;
			if(selectedPlugins.indexOf(plug.plugin.name) >= 0) {
				cnt++;
			}
		}
	}
	return '(' + cnt + '/' + tot + ')';
});

Handlebars.registerHelper('totalPluginCount', function() {
	var tot = 0;
	var cnt = 0;
	for(var i = 0; i < installData.availablePlugins.length; i++) {
		var a = installData.availablePlugins[i];
		for(var c = 0; c < a.plugins.length; c++) {
			var plug = a.plugins[c];
			tot++;
			if(selectedPlugins.indexOf(plug.name) >= 0) {
				cnt++;
			}
		}
	}
	return '(' + cnt + '/' + tot + ')';
});

Handlebars.registerHelper('inSelectedPlugins', function(val, options) {
	if(selectedPlugins.indexOf(val) >= 0) {
		return options.fn();
	}
});

var installData;

var getInstallData = function() {
	installData = require('./recommendedPlugins.js');
};

getInstallData();

// Include handlebars templates here - explicitly require them needed for hbsfy?
var welcomePanel = require('./templates/welcomePanel.hbs');
var progressPanel = require('./templates/progressPanel.hbs');
var pluginSelectionPanel = require('./templates/pluginSelectionPanel.hbs');
var successPanel = require('./templates/successPanel.hbs');
var offlinePanel = require('./templates/offlinePanel.hbs');
var pluginSetupWizard = require('./templates/pluginSetupWizard.hbs');

var categories = [];
var selectedCategory;
var availablePlugins = {};
var categorizedPlugins = {};
var recommendedPlugins = [];
var selectedPlugins = installData.defaultPlugins.slice(0); // default the set of plugins, this is just names

// Setup the dialog
var createPluginSetupWizard = function() {
	var $wizard = $(pluginSetupWizard());
	$wizard.appendTo('body');
	var $container = $wizard.find('.modal-content');
	
	var setPanel = function(panel, data, oncomplete) {
		var append = function() {
			$wizard.attr('data-panel', panel.name);
			$container.append(panel(data));
			if(oncomplete) {
				oncomplete();
			}
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
	var installId;
	var installPlugins = function(plugins) {
		//jenkins.get('/pluginManager/install?dynamicLoad=true&' + plugins.map(function(v){ return 'plugin.'+v+'=true'; }).join('&'));
		jenkins.post('/pluginManager/installPlugins', { dynamicLoad: true, plugins: plugins }, function(data) {
			if(data.status != 'ok') {
				// error!
			}
			installId = data.data.correlationId;
		});
		showInstallProgress();
	};
	
	var installDefaultPlugins = function() {
		installPlugins(installData.defaultPlugins);
	};
	
	// Define actions
	var showInstallProgress = function() {
		setPanel(progressPanel);
	
		var updateStatus = installId ?
		function() {
			jenkins.get('/updateCenter/installStatus?correlationId='+installId, function(data) {
				var i, j;
				var complete = 0;
				var total = 0;
				var jobs = data.data;
				for(i = 0; i < jobs.length; i++) {
					j = jobs[i];
					total++;
					if(/.*Success.*/.test(j.installStatus)||/.*Fail.*/.test(j.installStatus)) {
						complete++;
					}
				}
				
				$('.progress-bar').css({width: ((100.0 * complete)/total) + '%'});
				
				var $c = $('.install-console');
				{
					$c = $('.install-text');
					$c.children().remove();
					for(i = 0; i < jobs.length; i++) {
						j = jobs[i];
						if(/.*Success.*/.test(j.installStatus)) {
							$c.append('<div>'+j.title+'</div>');
						}
						else if(/.*Install.*/.test(j.installStatus)) {
							$c.append('<div>'+j.title+'</div>');
						}
						else if(/.*Fail.*/.test(j.installStatus)) {
							$c.append('<div>'+j.title+' -- FAILED '+'</div>');
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
		}
		: function() {
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
	
	var loadPluginData = function(oncomplete) {
		jenkins.get('/updateCenter/api/json?tree=availables[*,*[*]]', function(data) {
			var a = data.availables;
			for(var i = 0; i < a.length; i++) {
				var plug = a[i];
				availablePlugins[plug.name] = plug;
			}
			oncomplete();
		});
	};
	
	var loadCustomPluginPanel = function() {
		loadPluginData(function() {
			categories = [];
			for(var i = 0; i < installData.availablePlugins.length; i++) {
				var a = installData.availablePlugins[i];
				categories.push(a.category);
				var plugs = categorizedPlugins[a.category] = [];
				for(var c = 0; c < a.plugins.length; c++) {
					var plugInfo = a.plugins[c];
					var plug = availablePlugins[plugInfo.name];
					if(!plug) {
						console.log('Invalid plugin: ' + plugInfo.name);
						plug = {
							name: plugInfo.name,
							title: plugInfo.name
						};
					}
					recommendedPlugins.push(plug.name);
					plugs.push({
						category: a.category,
						plugin: $.extend(plug, {
							usage: plugInfo.usage,
							title: plugInfo.title ? plugInfo.title : plug.title,
							excerpt: plugInfo.excerpt ? plugInfo.excerpt : plug.excerpt,
							updated: new Date(plug.buildDate)
						})
					});
				}
			}
			setPanel(pluginSelectionPanel, pluginSelectionPanelData(), function() {
				$bs('.plugin-selector .plugin-list').scrollspy({ target: '.plugin-selector .categories' });
			});
		});
	};
	
	var pluginSelectionPanelData = function() {
		return {
			categories: categories,
			categorizedPlugins: categorizedPlugins,
			selectedPlugins: selectedPlugins
		};
	};

	var removePlugin = function(arr, item) {
		for (var i = arr.length; i--;) {
			if (arr[i] === item) {
				arr.splice(i, 1);
			}
		}
	};
	var addPlugin = function(arr, item) {
		arr.push(item);
	};
	
	var refreshPluginSelectionPanel = function() {
		var html = pluginSelectionPanel(pluginSelectionPanelData());
		
		var $upd = $(html);
		$upd.find('*[id]').each(function() {
			var $el = $(this);
			$('#'+$el.attr('id')).replaceWith($el);
		});
		if(lastSearch !== '') {
			searchForPlugins(lastSearch, false);
		}
	};
	
	$wizard.on('change', '.plugin-list input[type=checkbox]', function() {
		var $input = $(this);
		if($input.is(':checked')) {
			addPlugin(selectedPlugins, $input.attr('name'));
		}
		else {
			removePlugin(selectedPlugins, $input.attr('name'));
		}
		
		refreshPluginSelectionPanel();
	});
	
    var walk = function(elements, element, text, xform) {
        var i, child, n= element.childNodes.length;
        for (i = 0; i<n; i++) {
            child = element.childNodes[i];
            if (child.nodeType===3 && xform(child.data).indexOf(text)!==-1) {
                elements.push(element);
                break;
            }
        }
        for (i = 0; i<n; i++) {
            child = element.childNodes[i];
            if (child.nodeType===1)
                walk(elements, child, text, xform);
        }
    };
    
	var findElementsWithText = function(ancestor, text, xform) {
	    var elements= [];
	    walk(elements, ancestor, text, xform ? xform : function(d){ return d; });
	    return elements;
	};
	
	var findIndex = 0;
	var lastSearch = '';
	var scrollPlugin = function($pl, matches, term) {
		if(matches.length > 0) {
			if(lastSearch != term) {
				findIndex = 0;
			}
			else {
				findIndex = (findIndex+1) % matches.length;
			}
			var $el = $(matches[findIndex]);
			$el = $el.parents('label:first'); // scroll to the block
			if($el && $el.length > 0) {
				var pos = $pl.scrollTop() + $el.position().top;
				//console.log('scroll to: ' + new Error().stack);
				$pl.stop(true).animate({
					scrollTop: pos
				}, 100);
				setTimeout(function() { // wait for css transitions to finish
					var pos = $pl.scrollTop() + $el.position().top;
					$pl.stop(true).animate({
						scrollTop: pos
					}, 50);
				}, 50);
			}
		}
	};
	var searchForPlugins = function(text, scroll) {
		var $pl = $('.plugin-list');
		var $containers = $('.plugin-list label');
		
		// must always do this, as it's called after refreshing the panel (e.g. check/uncheck plugs)
		$containers.removeClass('match');
		if(text.length > 1) {
			$pl.addClass('searching');
			if(text == 'show:selected') {
				$('.plugin-list .selected').addClass('match');
			}
			else {
				var matches = findElementsWithText($pl[0], text.toLowerCase(), function(d) { return d.toLowerCase(); });
				$(matches).parents('label').addClass('match');
				if(lastSearch != text && scroll) {
					scrollPlugin($pl, matches, text);
				}
			}
		}
		else {
			findIndex = 0;
			$pl.removeClass('searching');
			$pl.scrollTop(0);
		}
		lastSearch = text;
	};
	$wizard.on('keyup change', '.plugin-select-controls input[name=searchbox]', function(e) {
		var val = $(this).val();
		searchForPlugins(val, true);
	});
	$wizard.on('click', '.clear-search', function() {
		$('input[name=searchbox]').val('');
		searchForPlugins('', false);
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
		'.install-recommended': installDefaultPlugins,
		'.install-custom': loadCustomPluginPanel,
		'.install-home': function() { setPanel(welcomePanel); },
		'.install-selected': function() { installPlugins(selectedPlugins); },
		'.toggle-install-details': toggleInstallDetails,
		'.install-done': finishInstallation,
		'.plugin-select-all': function() { selectedPlugins = recommendedPlugins.slice(0); refreshPluginSelectionPanel(); },
		'.plugin-select-none': function() { selectedPlugins = []; refreshPluginSelectionPanel(); },
		'.plugin-select-recommended': function() { selectedPlugins = installData.defaultPlugins.slice(0); refreshPluginSelectionPanel(); },
		'.plugin-show-selected': function() { $('input[name=searchbox]').val('show:selected'); searchForPlugins('show:selected', false); }
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
					setPanel(offlinePanel);
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
	createPluginSetupWizard();
}
else {
	$(function() {
		createPluginSetupWizard();
	});
}
