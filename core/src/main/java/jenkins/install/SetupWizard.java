package jenkins.install;

import java.io.File;
import java.io.IOException;
import java.util.List;
import java.util.UUID;
import java.util.logging.Logger;

import javax.servlet.ServletContext;

import org.jvnet.hudson.reactor.ReactorException;
import org.kohsuke.stapler.framework.adjunct.AdjunctManager;

import hudson.Plugin;
import hudson.PluginManager;
import hudson.model.Action;
import hudson.model.Describable;
import hudson.model.Descriptor;
import hudson.model.Hudson;
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
public class SetupWizard extends Hudson {
    private final Logger LOGGER = Logger.getLogger(Jenkins.class.getName());
    private ServletContext context;
    private String randomUUID;
    private AssetManager assetManager = new AssetManager();
    private I18n i18n = new I18n();
    private SetupWizardSecurityConfiguration securityConfiguration = new SetupWizardSecurityConfiguration();;

    public SetupWizard(File root, ServletContext context, PluginManager pluginManager) throws IOException, InterruptedException, ReactorException {
        super(root, context, pluginManager);
        this.context = context;
        generateToken();
    }

    @Override
    protected void setGlobalInstance(Jenkins jenkins) {
        // setup wizard is not global jenkins
    }

    private void generateToken() {
        randomUUID = UUID.randomUUID().toString();
        LOGGER.info("SetupWizard SecurityToken: " + randomUUID);
    }

    public Object getAssets() {
        return assetManager;
    }

    public Object getI18n() {
        return i18n;
    }

    @Override
    public AdjunctManager getAdjuncts(String dummy) {
        return Jenkins.getInstance().getAdjuncts(dummy);
    }

    @Override
    public UpdateCenter getUpdateCenter() {
        return Jenkins.getInstance().getUpdateCenter();
    }

    @Override
    public PluginManager getPluginManager() {
        return Jenkins.getInstance().getPluginManager();
    }

    @Override
    public boolean isUseCrumbs() {
        return Jenkins.getInstance().isUseCrumbs();
    }

    @Override
    public CrumbIssuer getCrumbIssuer() {
        return Jenkins.getInstance().getCrumbIssuer();
    }

    @SuppressWarnings("rawtypes")
    @Override
    public Descriptor getDescriptorByName(String id) {
        return Jenkins.getInstance().getDescriptorByName(id);
    }

    @Override
    public Descriptor getDescriptor(Class<? extends Describable> type) {
        return Jenkins.getInstance().getDescriptor(type);
    }

    @Override
    public List<Action> getActions() {
        return Jenkins.getInstance().getActions();
    }

    @Override
    public AuthorizationStrategy getAuthorizationStrategy() {
        return Jenkins.getInstance().getAuthorizationStrategy();
    }

    @Override
    public View getPrimaryView() {
        return Jenkins.getInstance().getPrimaryView();
    }

    @Override
    public void reload() throws IOException, InterruptedException, ReactorException {
    }

    @Override
    public Object getDynamic(String token) {
        if (!isAllowedSetupPage(token)) {
            LOGGER.warning("DISALLOW NON-SETUP PAGE: " + token);
            return this;
        }
        return Jenkins.getInstance().getDynamic(token);
    }

    private boolean isAllowedSetupPage(String token) {
        return "securityRealm".equals(token)
            || "configureSecurity".equals(token);
    }

    @Override
    public SecurityRealm getSecurityRealm() {
        return Jenkins.getInstance().getSecurityRealm();
    }

    public GlobalSecurityConfiguration getConfigureSecurity() {
        return securityConfiguration;
    }

    public void doCompleteSetup() {
        try {
            Jenkins j = Jenkins.getInstance();
            j.setInstallState(InstallState.INITIAL_SETUP_COMPLETED);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    @SuppressWarnings("rawtypes")
    @Override
    public Descriptor getDescriptor(String id) {
        return Jenkins.getInstance().getDescriptor(id);
    }

    @SuppressWarnings("rawtypes")
    @Override
    public Descriptor getDescriptorOrDie(Class<? extends Describable> type) {
        return Jenkins.getInstance().getDescriptorOrDie(type);
    }

    @SuppressWarnings("rawtypes")
    @Override
    public <T extends Descriptor> T getDescriptorByType(Class<T> type) {
        return Jenkins.getInstance().getDescriptorByType(type);
    }

    @Override
    public Plugin getPlugin(String shortName) {
        return Jenkins.getInstance().getPlugin(shortName);
    }

    @Override
    public <P extends Plugin> P getPlugin(Class<P> clazz) {
        return Jenkins.getInstance().getPlugin(clazz);
    }

    @Override
    public <P extends Plugin> List<P> getPlugins(Class<P> clazz) {
        return Jenkins.getInstance().getPlugins(clazz);
    }
}
