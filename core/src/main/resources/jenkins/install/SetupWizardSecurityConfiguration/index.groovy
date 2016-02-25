package jenkins.install.SetupWizardSecurityConfiguration

import hudson.security.SecurityRealm
import hudson.markup.MarkupFormatterDescriptor
import hudson.security.AuthorizationStrategy
import jenkins.model.GlobalConfiguration
import jenkins.model.Jenkins
import hudson.Functions
import hudson.model.Descriptor

def f=namespace(lib.FormTagLib)
def l=namespace(lib.LayoutTagLib)
def st=namespace("jelly:stapler")

l.html(norefresh:true, permission:app.instance.ADMINISTER, title:my.displayName) {
    l.main_panel {
        style(type:"text/css", '''
            @import url(https://maxcdn.bootstrapcdn.com/font-awesome/4.4.0/css/font-awesome.min.css);
            @import url(https://fonts.googleapis.com/css?family=Roboto:400,300,500,900,700);
            
            #main-panel {
                margin: 0;
                padding: 0;
            }
            tr td {
                padding-bottom: 2px;
            }
            body {
                padding: 20px 20px 20px 100px;
                font-family: 'roboto';
            }
            h1 {
                font-family: 'roboto', sans-serif;
                font-size: 48px;
                margin-top: 30px;
                font-weight: 500;
            }
            h1 img {
                position: absolute;
                right: -80px;
                top: 38px;
            }
        ''')
        f.form(method:"post",name:"config",action:"configure") {
            st.include(page: 'security-config')
        }
    }
}
