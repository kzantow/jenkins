package jenkins.install;

import java.io.IOException;

import org.jvnet.hudson.reactor.ReactorException;

import hudson.model.Hudson;
import jenkins.model.Jenkins;

/**
 * A transient Jenkins instance, does not run initialization, does not set itself
 * as the global instance
 */
public class TransientJenkins extends Hudson {
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
     * Apply any security settings from this Jenkins instance to the provided one
     * @param j jenkins instance to apply security settings to
     */
    public void applySecuritySettings(Jenkins j) {
        j.setSecurityRealm(getSecurityRealm());
        j.setAuthorizationStrategy(getAuthorizationStrategy());
        //j.setCrumbIssuer(getCrumbIssuer()); // this is set directly on the jenkins instance...
    }
}
