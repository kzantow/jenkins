/*
 * The MIT License
 *
 * Copyright (c) 2015, CloudBees, Inc.
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
package jenkins.install;

import org.kohsuke.accmod.Restricted;
import org.kohsuke.accmod.restrictions.NoExternalUse;

/**
 * Jenkins install state.
 *
 * @author <a href="mailto:tom.fennelly@gmail.com">tom.fennelly@gmail.com</a>
 */
@Restricted(NoExternalUse.class)
public enum InstallState {
    /**
     * New Jenkins install.
     */
    NEW(false),
    /**
     * New Jenkins install. The user has kicked off the process of installing an
     * initial set of plugins (via the install wizard).
     */
    INITIAL_PLUGINS_INSTALLING(false),
    /**
     * New Jenkins install. The initial set of plugins are now installed.
     */
    INITIAL_PLUGINS_INSTALLED(false),
    /**
     * Configuring security of an initial Jenkins install.
     */
    CONFIGURING_SECURITY(false),
    /**
     * Security configuration has been completed
     */
    SECURITY_CONFIGURATION_COMPLETED(false),
    /**
     * Creating an admin user for an initial Jenkins install.
     */
    CREATING_ADMIN_USER(false),
    /**
     * Admin user has been created
     */
    ADMIN_USER_CREATED(false),
    /**
     * Restart of an existing Jenkins install.
     */
    RESTART(true),
    /**
     * Upgrade of an existing Jenkins install.
     */
    UPGRADE(true),
    /**
     * Downgrade of an existing Jenkins install.
     */
    DOWNGRADE(true),
    /**
     * Jenkins started in test mode (JenkinsRule).
     */
    TEST(true),
    /**
     * The initial set up has been completed
     */
    INITIAL_SETUP_COMPLETED(true);

    private final boolean isSetupComplete;

    private InstallState(boolean isSetupComplete) {
        this.isSetupComplete = isSetupComplete;
    }

    /**
     * Indicates the initial setup is complete
     */
    public boolean isSetupComplete() {
        return isSetupComplete;
    }
}
