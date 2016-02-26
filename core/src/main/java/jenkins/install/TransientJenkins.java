package jenkins.install;

import java.io.IOException;

import org.jvnet.hudson.reactor.ReactorException;

import hudson.model.Hudson;
import hudson.security.SecurityRealm;
import jenkins.model.Jenkins;

/**
 * A transient Jenkins instance, does not run initialization, does not set itself
 * as the global instance
 */
public class TransientJenkins extends Hudson {
    private boolean useSecurity = false;
    private SecurityRealm securityRealm;

    public TransientJenkins(Jenkins base) throws IOException, InterruptedException, ReactorException {
        super(base.getRootDir(), base.servletContext, base.getPluginManager());
    }

    /**
     * Does NOT set as the global instance
     */
    @Override
    protected void setGlobalInstance(Jenkins jenkins) {
        // this does not create an actual instance
    }

    /**
     * Does NOT actually save
     */
    @Override
    public synchronized void save() throws IOException {
        // also, don't really save
    }

    /**
     * Does NOT reset security in the filters when set here
     */
    @Override
    public void setSecurityRealm(SecurityRealm securityRealm) {
        if(securityRealm==null)
            securityRealm= SecurityRealm.NO_AUTHENTICATION;
        this.useSecurity = true;
        this.securityRealm = securityRealm;
    }

    @Override
    public SecurityRealm getSecurityRealm() {
        return securityRealm;
    }

    /**
     * Apply any security settings from this Jenkins instance to the provided one
     * @param j jenkins instance to apply security settings to
     */
    public void applySecuritySettings(Jenkins j) {
        j.setSecurityRealm(getSecurityRealm());
        j.setAuthorizationStrategy(getAuthorizationStrategy());
        //j.setCrumbIssuer(getCrumbIssuer()); // this is set directly on the jenkins instance...
    }
}
