package hudson.security.GlobalSecurityConfiguration

import hudson.security.SecurityRealm
import hudson.markup.MarkupFormatterDescriptor
import hudson.security.AuthorizationStrategy
import jenkins.model.GlobalConfiguration
import hudson.Functions
import hudson.model.Descriptor

def f=namespace(lib.FormTagLib)
def l=namespace(lib.LayoutTagLib)
def st=namespace("jelly:stapler")

l.layout(norefresh:true, permission:app.ADMINISTER, title:my.displayName) {
    l.main_panel {
        f.form(method:"post",name:"config",action:"configure") {
            st.include(page: 'security-config')

            f.bottomButtonBar {
                f.submit(value:_("Save"))
                f.apply()
            }
        }
    }
}
