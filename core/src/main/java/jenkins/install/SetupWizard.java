package jenkins.install;

import java.io.IOException;
import java.util.List;
import java.util.UUID;
import java.util.logging.Logger;
import java.util.regex.Pattern;

import javax.annotation.Nonnull;
import javax.servlet.Filter;
import javax.servlet.FilterChain;
import javax.servlet.FilterConfig;
import javax.servlet.ServletException;
import javax.servlet.ServletRequest;
import javax.servlet.ServletResponse;
import javax.servlet.http.Cookie;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletRequestWrapper;
import javax.servlet.http.HttpServletResponse;

import org.jvnet.hudson.reactor.ReactorException;
import org.kohsuke.accmod.Restricted;
import org.kohsuke.accmod.restrictions.NoExternalUse;
import org.kohsuke.stapler.StaplerRequest;
import org.kohsuke.stapler.StaplerResponse;
import org.kohsuke.stapler.framework.adjunct.AdjunctManager;

import hudson.Functions;
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
import hudson.util.PluginServletFilter;
import jenkins.I18n;
import jenkins.model.AssetManager;
import jenkins.model.Jenkins;

/**
 * A Jenkins instance used during first-run to provide a limited set of services while
 * initial installation is in progress
 */
public class SetupWizard implements DescriptorByNameOwner {
    /**
     * This filter will validate that the security token is provided
     */
    private final Filter VALIDATE_TOKEN_FILTER = new Filter() {
        @Override
        public void init(FilterConfig cfg) throws ServletException {
        }

        @Override
        public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain) throws IOException, ServletException {
            // As an extra measure of security, the install wizard generates a security token, and
            // requires the user to enter it before proceeding through the installation. Once set
            // we'll set a cookie so the subsequent operations succeed
            if (requireSecurityToken && request instanceof HttpServletRequest) {
                HttpServletRequest req = (HttpServletRequest)request;
                Cookie cookie = Functions.getCookie(req, securityTokenParameterName);
                if (cookie == null || !randomUUID.equals(cookie.getValue())) {
                    if (randomUUID.equals(req.getParameter(securityTokenParameterName))) {
                        ((HttpServletResponse)response).addCookie(new Cookie(securityTokenParameterName, randomUUID));
                    }
                    else if (!Pattern.compile(".*[.](css|ttf|gif|wof|png|js)").matcher(req.getRequestURI()).matches()) {
                        // Allow js & css requests through
                        chain.doFilter(new HttpServletRequestWrapper(req) {
                            public String getRequestURI() {
                                return getContextPath() + "/enter-security-token";
                            }
                        }, response);
                        return;
                    }
                }
            }
            chain.doFilter(request, response);
        }

        @Override
        public void destroy() {
        }
    };

    private final Logger LOGGER = Logger.getLogger(Jenkins.class.getName());
    private String randomUUID;
    private AssetManager assetManager = new AssetManager();
    private I18n i18n = new I18n();
    private SetupWizardSecurityConfiguration securityConfiguration = new SetupWizardSecurityConfiguration();

    /**
     * Whether this system requires a security token; -Djenkins.install.skip.security=true will
     * allow skipping of this security token
     */
    private boolean requireSecurityToken = !"true".equalsIgnoreCase(System.getProperty("jenkins.install.skip.security"));

    /**
     * The security token parameter name
     */
    private String securityTokenParameterName = ".installWizardSecurityToken";

    /**
     * Constructor, will generate a security token
     */
    public SetupWizard() throws IOException, InterruptedException, ReactorException {
        generateToken();
    }

    public String getSecurityTokenParameterName() {
        return securityTokenParameterName;
    }

    @Nonnull
    @Restricted(NoExternalUse.class)
    Jenkins getInstance() { // not public so Stapler won't dispatch it
        return Jenkins.getActiveInstance();
    }

    private void generateToken() {
        if (requireSecurityToken) {
            // if Hudson is newly set up with the security realm and there's no user account created yet,
            // insert a filter that asks the user to create one
            try {
                PluginServletFilter.addFilter(VALIDATE_TOKEN_FILTER);
            } catch (ServletException e) {
                throw new AssertionError(e); // never happen because our Filter.init is no-op
            }

            randomUUID = UUID.randomUUID().toString().replace("-", "").toLowerCase();
            LOGGER.info("\n\n*************************************************************\n"
                    + "*************************************************************\n"
                    + "*************************************************************\n"
                    + "\n"
                    + "Jenkins initial setup is required. A security token is required to proceed. \n"
                    + "Please copy the following setup to use the installation wizard: \n"
                    + "\n"
                    + "" + randomUUID + "\n"
                    + "\n"
                    + "*************************************************************\n"
                    + "*************************************************************\n"
                    + "*************************************************************\n");
        }
    }

    public void cleanUp() {
        if (requireSecurityToken) {
            // if Hudson is newly set up with the security realm and there's no user account created yet,
            // insert a filter that asks the user to create one
            try {
                PluginServletFilter.removeFilter(VALIDATE_TOKEN_FILTER);
            } catch (ServletException e) {
                throw new AssertionError(e); // never happen because our Filter.init is no-op
            }
        }
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
        return getInstance().getAdjuncts(dummy);
    }

    public UpdateCenter getUpdateCenter() {
        return getInstance().getUpdateCenter();
    }

    public PluginManager getPluginManager() {
        return getInstance().getPluginManager();
    }

    public boolean isUseCrumbs() {
        return getInstance().isUseCrumbs();
    }

    public CrumbIssuer getCrumbIssuer() {
        return getInstance().getCrumbIssuer();
    }

    @SuppressWarnings("rawtypes")
    public Descriptor getDescriptorByName(String id) {
        return getInstance().getDescriptorByName(id);
    }

    public Descriptor<?> getDescriptor(Class<? extends Describable<?>> type) {
        return getInstance().getDescriptor(type);
    }

    public List<Action> getActions() {
        return getInstance().getActions();
    }

    public AuthorizationStrategy getAuthorizationStrategy() {
        return getInstance().getAuthorizationStrategy();
    }

    public View getPrimaryView() {
        return getInstance().getPrimaryView();
    }

    /**
     * Block as many requests as possible; allow serving a few required CSS files
     */
    public void doDynamic(StaplerRequest req, StaplerResponse rsp) throws IOException, ServletException {
        if (req.getOriginalRequestURI().endsWith(".css")) {
            getAdjuncts("").doDynamic(req, rsp);
        }
    }

    /**
     * Forward to the global config
     */
    public void doProxyConfigure(StaplerRequest req) throws IOException, ServletException {
        getInstance().getPluginManager().doProxyConfigure(req);
    }

    public SecurityRealm getSecurityRealm() {
        return getInstance().getSecurityRealm();
    }

    public GlobalSecurityConfiguration getConfigureSecurity() {
        return securityConfiguration;
    }

    @SuppressWarnings("rawtypes")
    public Descriptor getDescriptor(String id) {
        return getInstance().getDescriptor(id);
    }

    @SuppressWarnings("rawtypes")
    public Descriptor getDescriptorOrDie(Class<? extends Describable> type) {
        return getInstance().getDescriptorOrDie(type);
    }

    @SuppressWarnings("rawtypes")
    public <T extends Descriptor> T getDescriptorByType(Class<T> type) {
        return getInstance().getDescriptorByType(type);
    }
}
