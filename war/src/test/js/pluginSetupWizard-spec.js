var jsTest = require("jenkins-js-test");
var jquery = require('jquery-detached');

var getJQuery = function() {
    var $ = jquery.getJQuery();
    $.fx.off = true;
    return $;
};

// call this for each test, it will provide a new wizard, jquery to the caller
var test = function(test) {
	jsTest.onPage(function() {
		// deps
	    var $ = getJQuery();
	    
	    // Respond to status request
	    $.ajax = function(call) {
	    	//console.log('ajax call: ' + call.url + new Error().stack)
	    	
	    	switch(call.url) {
		    	case '/jenkins/updateCenter/installStatus?correlationId=1': {
		    		call.success({
	    				data: [
    				      {
    				    	  type: 'InstallJob',
    				    	  installStatus: 'Success'
    				      }
    				    ]
		    		});
		    		break;
		    	}
		    	case '/jenkins/updateCenter/api/json?tree=jobs[name,status[*],errorMessage]': {
		    		call.success({
	    				jobs: [
    				      {
    				    	  type: 'InstallJob',
    				    	  installStatus: 'Success'
    				      }
    				    ]
		    		});
		    		break;
		    	}
		    	case '/jenkins/updateCenter/api/json?tree=availables[*,*[*]]': {
		    		call.success({
		    			availables: [
 		    			    {
		    			    	name: 'msbuild',
		    			    	title: 'MS Build Test Thing'
		    			    },
		    			    {
		    			    	name: 'other',
		    			    	title: 'Other thing'
		    			    }
			            ]
		    		});
		    		break;
		    	}
		    	case '/jenkins/updateCenter/connectionStatus?siteId=default': {
		    		call.success({
		    			status: 'ok',
		    			data: {
		    				updatesite: 'OK',
		    				internet: 'OK'
		    			}
		    		});
		    		break;
		    	}
	    	}
	    };
	    
	    // load the module
	    var pluginSetupWizard = jsTest.requireSrcModule('pluginSetupWizardGui');

        // exported init
        pluginSetupWizard.init();
	    
	    test($, pluginSetupWizard);
	});
};

// helper to validate the appropriate plugins were installed
var validatePlugins = function(plugins, complete) {
    var jenkins = jsTest.requireSrcModule('util/jenkins');
    jenkins.post = function(url, data, cb) {
        expect(url).toBe('/pluginManager/installPlugins');
        var allMatch = true;
        for(var i = 0; i < plugins.length; i++) {
        	if(data.plugins.indexOf(plugins[i]) < 0) {
        		allMatch = false;
        		break;
        	}
        }
        if(!allMatch) {
            expect(JSON.stringify(plugins)).toBe('In: ' + JSON.stringify(data.plugins));
        }
        // return status
        cb({status:'ok',data:{correlationId:1}});
	    if(complete) {
	    	complete();
	    }
    };
};

describe("pluginSetupWizard.js", function () {
	it("wizard shows", function (done) {
		test(function($) {
            // Make sure the dialog was shown
            var $wizard = $('.plugin-setup-wizard');
            expect($wizard.size()).toBe(1);
            
            done();
        });
    });

	it("offline shows", function (done) {
		jsTest.onPage(function() {
			// deps
		    var $ = getJQuery();
		    var jenkins = jsTest.requireSrcModule('util/jenkins');
		    
		    var get = jenkins.get;
		    try {
			    // Respond with failure
			    jenkins.get = function(url, cb) {
			    	if(url == '/updateCenter/connectionStatus?siteId=default') {
			    		cb({
		    				status: 'ok',
			    			data: {
			    				updatesite: 'ERROR',
			    				internet: 'ERROR'
			    			}
			    		});
			    	}
			    };
			    
			    // load the module
			    var pluginSetupWizard = jsTest.requireSrcModule('pluginSetupWizardGui');

		        // exported init
		        pluginSetupWizard.init();
		        
			    expect($('.welcome-panel h1').text()).toBe('Offline');
	            
		    	done();
		    } finally {
		    	jenkins.get = get;
		    }
		});
    });
	
    it("install defaults", function (done) {
		test(function($) {
            var jenkins = jsTest.requireSrcModule('util/jenkins');
            var defaults = jsTest.requireSrcModule('recommendedPlugins');
            
            // Make sure the dialog was shown
            var wizard = $('.plugin-setup-wizard');
            expect(wizard.size()).toBe(1);
            
            var goButton = $('.install-recommended');
            expect(goButton.size()).toBe(1);
            
            // validate a call to installPlugins with our defaults
            validatePlugins(defaults.defaultPlugins, done);
            
            goButton.click();
        });
    });
    
    var doit = function($, sel, trigger) {
    	var $el = $(sel);
    	if($el.length != 1) {
    		console.log('Not found! ' + sel);
    	}
    	if(trigger == 'check') {
    		$el.prop('checked', true);
    		trigger = 'change';
    	}
    	$el.trigger(trigger);
    };

    it("install custom", function (done) {
		test(function($) {
            $('.install-custom').click();
            
            // validate a call to installPlugins with our defaults
            validatePlugins(['msbuild','slack'], done);
            
            // install a specific, other 'set' of plugins
            $('input[name=searchbox]').val('msbuild');
            doit($, 'input[name=searchbox]', 'blur');
            
            doit($, '.plugin-select-none', 'click');
            
            doit($, 'input[name="msbuild"]', 'check');
            doit($, 'input[name="slack"]', 'check');
            
            doit($, '.install-selected', 'click');
        });
    });

});