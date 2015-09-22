var jsTest = require("jenkins-js-test");
var jquery = require('jquery-detached');

// just run timeout immediately
global.setTimeout = function(fn) { fn(); }

// call this for each test, it will provide a new wizard, jquery to the caller
var test = function(test) {
	jsTest.onPage(function() {
		// deps
	    var $ = jquery.getJQuery();
	    $.fx.off = true;
	    $.fn.animate = function(props, duration, cb) {
	    	console.log('animate:' + JSON.stringify(cb));
	    	if(cb) cb.apply(this);
	    };
	    
	    $.fn.fadeOut = function(duration, cb) {
	    	console.log('fadeOut:' + JSON.stringify(cb));
	    	if(cb) cb.apply(this);
	    };
	    
	    // Respond to status request
	    $.ajax = function(call) {
	    	console.log('ajax call: ' + call.url + new Error().stack)
	    	
	    	switch(call.url) {
		    	case '/updateCenter/installStatus?correlationId=1': {
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
		    	case '/updateCenter/api/json?tree=availables[*,*[*]]': {
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
		    var $ = jquery.getJQuery();
		    var jenkins = jsTest.requireSrcModule('util/jenkins');
		    
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
			        
		            console.log($('body').html());
		            
		    		
				    expect($('.welcome-panel h1').text()).toBe('Offline');
		            
			    	done();
		    	}
		    };
		    
		    // load the module
		    var pluginSetupWizard = jsTest.requireSrcModule('pluginSetupWizardGui');

	        // exported init
	        pluginSetupWizard.init();
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

    it("install custom", function (done) {
		test(function($) {
            $('.install-custom').click();
            
            // validate a call to installPlugins with our defaults
            validatePlugins(['msbuild'], done);
            
            // install a specific, other 'set' of plugins
            $('input[name=searchbox]').val('msbuild');
            
            console.log($('body').html());
            
            $('.plugin-select-none').click();
            
            console.log($('body').html());
            
            $('input[name=msbuild]').click();
            
            console.log($('body').html());
            
            $('.install-selected').click();
        });
    });

});