package jenkins.install;

import java.io.IOException;
import java.util.List;
import java.util.UUID;
import java.util.logging.Logger;

import javax.servlet.ServletException;

import org.jvnet.hudson.reactor.ReactorException;
import org.kohsuke.accmod.Restricted;
import org.kohsuke.accmod.restrictions.NoExternalUse;
import org.kohsuke.stapler.StaplerRequest;
import org.kohsuke.stapler.StaplerResponse;
import org.kohsuke.stapler.framework.adjunct.AdjunctManager;

import hudson.PluginManager;
import hudson.model.Action;
import hudson.model.Describable;
import hudson.model.Descriptor;
import hudson.model.DescriptorByNameOwner;
import hudson.model.UpdateCenter;
import hudson.model.View;
import hudson.security.AuthorizationStrategy;
import hudson.security.GlobalSecurityConfiguration;
import hudson.security.SecurityRealm;
import hudson.security.csrf.CrumbIssuer;
import jenkins.I18n;
import jenkins.model.AssetManager;
import jenkins.model.Jenkins;

/**
 * A Jenkins instance used during first-run to provide a limited set of services while
 * initial installation is in progress
 */
public class SetupWizard implements DescriptorByNameOwner {
    private final Logger LOGGER = Logger.getLogger(Jenkins.class.getName());
    private String randomUUID;
    private AssetManager assetManager = new AssetManager();
    private I18n i18n = new I18n();
    private SetupWizardSecurityConfiguration securityConfiguration = new SetupWizardSecurityConfiguration();;

    public SetupWizard() throws IOException, InterruptedException, ReactorException {
        generateToken();
    }

    @Restricted(NoExternalUse.class)
    Jenkins getInstance() { // not public so Stapler won't dispatch it
        return Jenkins.getInstance();
    }

    private void generateToken() {
        randomUUID = UUID.randomUUID().toString();
        LOGGER.info("SetupWizard SecurityToken: " + randomUUID);
    }

    public AssetManager getAssets() {
        return assetManager;
    }

    public I18n getI18n() {
        return i18n;
    }

    @Override
    public String getDisplayName() {
        return "Setup Wizard";
    }

    public AdjunctManager getAdjuncts(String dummy) {
        return Jenkins.getInstance().getAdjuncts(dummy);
    }

    public UpdateCenter getUpdateCenter() {
        return Jenkins.getInstance().getUpdateCenter();
    }

    public PluginManager getPluginManager() {
        return Jenkins.getInstance().getPluginManager();
    }

    public boolean isUseCrumbs() {
        return Jenkins.getInstance().isUseCrumbs();
    }

    public CrumbIssuer getCrumbIssuer() {
        return Jenkins.getInstance().getCrumbIssuer();
    }

    @SuppressWarnings("rawtypes")
    public Descriptor getDescriptorByName(String id) {
        return Jenkins.getInstance().getDescriptorByName(id);
    }

    public Descriptor<?> getDescriptor(Class<? extends Describable<?>> type) {
        return Jenkins.getInstance().getDescriptor(type);
    }

    public List<Action> getActions() {
        return Jenkins.getInstance().getActions();
    }

    public AuthorizationStrategy getAuthorizationStrategy() {
        return Jenkins.getInstance().getAuthorizationStrategy();
    }

    public View getPrimaryView() {
        return Jenkins.getInstance().getPrimaryView();
    }

    public void reload() throws IOException, InterruptedException, ReactorException {
    }

    /**
     * Block as many requests as possible; allow serving a few required CSS files
     */
    public void doDynamic(StaplerRequest req, StaplerResponse rsp) throws IOException, ServletException {
        if(req.getOriginalRequestURI().endsWith(".css")) {
            getAdjuncts("").doDynamic(req, rsp);
        }
    }

    public SecurityRealm getSecurityRealm() {
        return Jenkins.getInstance().getSecurityRealm();
    }

    public GlobalSecurityConfiguration getConfigureSecurity() {
        return securityConfiguration;
    }

    @SuppressWarnings("rawtypes")
    public Descriptor getDescriptor(String id) {
        return Jenkins.getInstance().getDescriptor(id);
    }

    @SuppressWarnings("rawtypes")
    public Descriptor getDescriptorOrDie(Class<? extends Describable> type) {
        return Jenkins.getInstance().getDescriptorOrDie(type);
    }

    @SuppressWarnings("rawtypes")
    public <T extends Descriptor> T getDescriptorByType(Class<T> type) {
        return Jenkins.getInstance().getDescriptorByType(type);
    }
}
