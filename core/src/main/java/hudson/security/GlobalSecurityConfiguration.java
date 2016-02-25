/*
 * The MIT License
 *
 * Copyright (c) 2011, CloudBees, Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
package hudson.security;

import java.io.IOException;
import java.util.Collections;
import java.util.logging.Level;
import java.util.logging.Logger;

import javax.annotation.Nonnull;
import javax.servlet.ServletException;

import org.acegisecurity.context.SecurityContext;
import org.acegisecurity.context.SecurityContextHolder;
import org.jvnet.hudson.reactor.ReactorException;
import org.kohsuke.stapler.HttpResponse;
import org.kohsuke.stapler.StaplerRequest;
import org.kohsuke.stapler.StaplerResponse;

import com.google.common.base.Predicate;

import hudson.BulkChange;
import hudson.Extension;
import hudson.Functions;
import hudson.markup.MarkupFormatter;
import hudson.model.Describable;
import hudson.model.Descriptor;
import hudson.model.Descriptor.FormException;
import hudson.model.ManagementLink;
import hudson.util.FormApply;
import hudson.util.HttpResponses;
import jenkins.install.InstallState;
import jenkins.install.TransientJenkins;
import jenkins.model.GlobalConfigurationCategory;
import jenkins.model.Jenkins;
import jenkins.util.ServerTcpPort;
import net.sf.json.JSONObject;

/**
 * Security configuration.
 *
 * For historical reasons, most of the actual configuration values are stored in {@link Jenkins}.
 *
 * @author Kohsuke Kawaguchi
 */
@Extension(ordinal = Integer.MAX_VALUE - 210)
public class GlobalSecurityConfiguration extends ManagementLink implements Describable<GlobalSecurityConfiguration> {

    private static final Logger LOGGER = Logger.getLogger(GlobalSecurityConfiguration.class.getName());

    @Nonnull
    protected Jenkins getJenkins() {
        Jenkins j = Jenkins.getInstance();
        if(j == null) {
            throw new NullPointerException("Jenkins not found.");
        }
        return j;
    }

    public MarkupFormatter getMarkupFormatter() {
        return getJenkins().getMarkupFormatter();
    }

    public int getSlaveAgentPort() {
        return getJenkins().getSlaveAgentPort();
    }

    public boolean isDisableRememberMe() {
        return getJenkins().isDisableRememberMe();
    }

    public boolean isUseSecurity() {
        return getJenkins().isUseSecurity();
    }

    public SecurityRealm getSecurityRealm() {
        return getJenkins().getSecurityRealm();
    }

    public AuthorizationStrategy getAuthorizationStrategy() {
        return getJenkins().getAuthorizationStrategy();
    }

    /**
     * This is a method to test authentication configuration, it configures a
     * transient Jenkins instance and uses that to invoke configuration methods
     */
    public synchronized void doTestAuthentication(StaplerRequest req, StaplerResponse rsp) throws IOException, ServletException, FormException {
        SecurityContext oldContext = ACL.impersonate(ACL.SYSTEM);
        try {
            Jenkins wiz = new TransientJenkins(Jenkins.getInstance());
            configure(wiz, req, req.getSubmittedForm());
            SecurityRealm securityRealm = wiz.getSecurityRealm();
            if(securityRealm instanceof AbstractPasswordBasedSecurityRealm) {
                String username = req.getParameter("username");
                String password = req.getParameter("password");
                ((AbstractPasswordBasedSecurityRealm) securityRealm).authenticate(username, password);
            }
        } catch (Exception e) {
            throw new RuntimeException(e);
        } finally {
            SecurityContextHolder.setContext(oldContext);
        }
    }

    /**
     * This is the primary configuration method, which applies directly to the global
     * Jenkins instance
     */
    public synchronized void doConfigure(StaplerRequest req, StaplerResponse rsp) throws IOException, ServletException, FormException {
        // for compatibility reasons, the actual value is stored in Jenkins
        BulkChange bc = new BulkChange(getJenkins());
        try{
            boolean result = configure(getJenkins(), req, req.getSubmittedForm());
            LOGGER.log(Level.FINE, "security saved: "+result);
            getJenkins().save();
            FormApply.success(req.getContextPath()+"/manage").generateResponse(req, rsp, null);
        } finally {
            bc.commit();
        }
    }

    protected boolean configure(Jenkins j, StaplerRequest req, JSONObject json) throws hudson.model.Descriptor.FormException {
        // for compatibility reasons, the actual value is stored in Jenkins
        Jenkins.getInstance().checkPermission(Jenkins.ADMINISTER); // Authenticate against global jenkins
        if (json.has("useSecurity")) {
            JSONObject security = json.getJSONObject("useSecurity");
            j.setDisableRememberMe(security.optBoolean("disableRememberMe", false));
            j.setSecurityRealm(SecurityRealm.all().newInstanceFromRadioList(security, "realm"));
            j.setAuthorizationStrategy(AuthorizationStrategy.all().newInstanceFromRadioList(security, "authorization"));
            try {
                j.setSlaveAgentPort(new ServerTcpPort(security.getJSONObject("slaveAgentPort")).getPort());
            } catch (IOException e) {
                throw new hudson.model.Descriptor.FormException(e, "slaveAgentPortType");
            }
        } else {
            j.disableSecurity();
        }

        if (json.has("markupFormatter")) {
            j.setMarkupFormatter(req.bindJSON(MarkupFormatter.class, json.getJSONObject("markupFormatter")));
        } else {
            j.setMarkupFormatter(null);
        }

        // persist all the additional security configs
        boolean result = true;
        for(Descriptor<?> d : Functions.getSortedDescriptorsForGlobalConfig(FILTER)){
            result &= configureDescriptor(req,json,d);
        }

        return result;
    }

    private boolean configureDescriptor(StaplerRequest req, JSONObject json, Descriptor<?> d) throws FormException {
        // collapse the structure to remain backward compatible with the JSON structure before 1.
        String name = d.getJsonSafeClassName();
        JSONObject js = json.has(name) ? json.getJSONObject(name) : new JSONObject(); // if it doesn't have the property, the method returns invalid null object.
        json.putAll(js);
        return d.configure(req, js);
    }

    @Override
    public String getDisplayName() {
        return getDescriptor().getDisplayName();
    }

    @Override
    public String getDescription() {
        return Messages.GlobalSecurityConfiguration_Description();
    }

    @Override
    public String getIconFileName() {
        return "secure.png";
    }

    @Override
    public String getUrlName() {
        return "configureSecurity";
    }

    @Override
    public Permission getRequiredPermission() {
        return Jenkins.ADMINISTER;
    }

    public static Predicate<GlobalConfigurationCategory> FILTER = new Predicate<GlobalConfigurationCategory>() {
        public boolean apply(GlobalConfigurationCategory input) {
            return input instanceof GlobalConfigurationCategory.Security;
        }
    };

    /**
     * @return
     * @see hudson.model.Describable#getDescriptor()
     */
    @SuppressWarnings("unchecked")
    @Override
    public Descriptor<GlobalSecurityConfiguration> getDescriptor() {
        return getJenkins().getDescriptorOrDie(getClass());
    }

    @Extension
    public static class DescriptorImpl extends Descriptor<GlobalSecurityConfiguration> {
        @Override
        public String getDisplayName() {
            return Messages.GlobalSecurityConfiguration_DisplayName();
        }
    }
}
