package org.jenkinsci.setup;

import javax.inject.Inject;

import hudson.Extension;
import hudson.PluginManager;
import hudson.model.PageDecorator;
import jenkins.model.Jenkins;

@Extension
public class PluginSetupWizardPageDecorator extends PageDecorator {
	@Inject Jenkins jenkins;
	@Inject PluginManager pluginManager;
	
	/**
	 * In order to load the persisted global configuration, you have to call
	 * load() in the constructor.
	 */
	public PluginSetupWizardPageDecorator() {
		load();
	}

	/**
	 * This human readable name is used in the configuration screen.
	 */
	public String getDisplayName() {
		return "Plugin Setup Wizard";
	}
}
