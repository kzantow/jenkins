package jenkins.install;

import java.io.IOException;
import java.util.Collections;

import javax.servlet.ServletException;

import org.jvnet.hudson.reactor.ReactorException;
import org.kohsuke.stapler.HttpResponse;
import org.kohsuke.stapler.StaplerRequest;
import org.kohsuke.stapler.StaplerResponse;

import hudson.BulkChange;
import hudson.model.Descriptor;
import hudson.model.Descriptor.FormException;
import hudson.security.FullControlOnceLoggedInAuthorizationStrategy;
import hudson.security.GlobalSecurityConfiguration;
import hudson.security.HudsonPrivateSecurityRealm;
import hudson.security.csrf.DefaultCrumbIssuer;
import hudson.util.HttpResponses;
import jenkins.model.Jenkins;

/**
 * A custom global security configuration, which uses a different Jenkins instance
 */
public class SetupWizardSecurityConfiguration extends GlobalSecurityConfiguration {
    Jenkins jenkins;

    public SetupWizardSecurityConfiguration() throws IOException, InterruptedException, ReactorException {
        this.jenkins =  new TransientJenkins(Jenkins.getInstance());
        configureGlobalSecurityDefaults(jenkins);
    }

    @Override
    protected Jenkins getJenkins() {
        return jenkins;
    }

    public void setJenkins(Jenkins jenkins) {
        this.jenkins = jenkins;
    }

    @Override
    public Descriptor<GlobalSecurityConfiguration> getDescriptor() {
        return new DescriptorImpl();
    }

    private void configureGlobalSecurityDefaults(Jenkins j) {
        HudsonPrivateSecurityRealm securityRealm = new HudsonPrivateSecurityRealm(false, false, null);
        //securityRealm.setForceFirstUserCreation(false); // this will take over
        j.setSecurityRealm(securityRealm);
        j.setDisableRememberMe(true);
        FullControlOnceLoggedInAuthorizationStrategy authStrategy = new FullControlOnceLoggedInAuthorizationStrategy();
        j.setAuthorizationStrategy(authStrategy);
        try {
            j.setSlaveAgentPort(-1); // -1 to disable
        } catch (IOException e) {
            throw new RuntimeException(e);
        }

        // setting crumbs globally shouldn't cause problems
        Jenkins.getInstance().setCrumbIssuer(new DefaultCrumbIssuer(false));
    }

    /**
     * Call to configure with a JSON response
     */
    public synchronized HttpResponse doConfigureJson(StaplerRequest req, StaplerResponse rsp) throws IOException, ServletException, FormException {
        // This may configure with SetupWizard
        Jenkins jenkins = Jenkins.getInstance();
        if(jenkins.getInstallState() != InstallState.INITIAL_SETUP_COMPLETED) {
            jenkins.checkPermission(Jenkins.ADMINISTER); // Authenticate against global jenkins
        }
        try {
            TransientJenkins securityHolder = new TransientJenkins(jenkins);
            configure(securityHolder, req, req.getSubmittedForm());

            // move config to global jenkins
            // and then move the security settings over and save
            BulkChange bc = new BulkChange(jenkins);
            try{
                securityHolder.applySecuritySettings(jenkins);
                jenkins.save(); // now, actually save the configuration
                if(HudsonPrivateSecurityRealm.requiresLocalUser(jenkins)) {
                    jenkins.setInstallState(InstallState.CREATING_ADMIN_USER);
                    return HttpResponses.okJSON(Collections.singletonMap("requiresLocalUser", true));
                }
                else {
                    jenkins.setInstallState(InstallState.SECURITY_CONFIGURATION_COMPLETED);
                    return HttpResponses.okJSON(Collections.singletonMap("requiresLocalUser", false));
                }
            } finally {
                bc.commit();
            }
        } catch (FormException e) {
            e.generateResponse(req, rsp, this);
            return HttpResponses.errorJSON(e.getMessage());
        } catch (InterruptedException | ReactorException e) {
            throw new RuntimeException(e);
        }
    }

    public static class DescriptorImpl extends GlobalSecurityConfiguration.DescriptorImpl {
    }
}
