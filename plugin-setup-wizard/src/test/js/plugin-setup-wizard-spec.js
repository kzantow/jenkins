var jsTest = require("jenkins-js-test");

var log = function(msg) {
	process.stdout.write(msg + '\n');
};

describe("plugin-setup-wizard.js", function () {
    it("- simple show and go test", function (done) {
        jsTest.onPage(function() {
            var $ = require('jquery-detached').getJQuery();
            var $bs = require('bootstrap-detached').getBootstrap();
            
            global.isTest = true;
            
            // well, this worked with browserify
            
        	var wiz = jsTest.requireSrcModule('plugin-setup-wizard.js');
        	
            // Make sure the dialog was shown.
            var wizard = $('.plugin-setup-wizard > .modal');
            expect(wizard.size()).toBe(1);
            
            done();
        }, '<html><head data-rooturl="/jenkins"></head><body><div class="plugin-setup-wizard">Buuuh</div></body></html>');
    });
});
