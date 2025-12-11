import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, FileText, AlertCircle } from "lucide-react";

const Policies = () => {
  const location = useLocation();

  useEffect(() => {
    // Load Privacy Policy script
    const privacyScript = document.createElement('script');
    privacyScript.src = "https://policies.termageddon.com/api/embed/WTBaaWVrRXlTa0Y0UlRJMk1IYzlQUT09.js";
    privacyScript.async = true;
    document.body.appendChild(privacyScript);

    // Load Terms of Service script
    const termsScript = document.createElement('script');
    termsScript.src = "https://policies.termageddon.com/api/embed/UzB0a2RUWTJPVEJEYmswNE0wRTlQUT09.js";
    termsScript.async = true;
    document.body.appendChild(termsScript);

    // Load first Disclaimer script
    const disclaimer1Script = document.createElement('script');
    disclaimer1Script.src = "https://policies.termageddon.com/api/embed/ZWk4NE5GQmpabGt3Ym5CQ1oxRTlQUT09.js";
    disclaimer1Script.async = true;
    document.body.appendChild(disclaimer1Script);

    // Load second Disclaimer script
    const disclaimer2Script = document.createElement('script');
    disclaimer2Script.src = "https://policies.termageddon.com/api/embed/VkdWV2RIcFpaMkpOYlhCalltYzlQUT09.js";
    disclaimer2Script.async = true;
    document.body.appendChild(disclaimer2Script);

    return () => {
      document.body.removeChild(privacyScript);
      document.body.removeChild(termsScript);
      document.body.removeChild(disclaimer1Script);
      document.body.removeChild(disclaimer2Script);
    };
  }, []);

  useEffect(() => {
    // Scroll to specific section based on hash
    const hash = location.hash.replace('#', '');
    if (hash) {
      setTimeout(() => {
        const element = document.getElementById(hash);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      }, 500); // Delay to allow content to load
    }
  }, [location.hash]);

  const defaultTab = location.hash.replace('#', '') || 'privacy';

  return (
    <div className="min-h-screen bg-background py-12">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Legal Policies</h1>
          <p className="text-muted-foreground">
            Our commitment to transparency and your rights
          </p>
        </div>

        <Tabs defaultValue={defaultTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="privacy" id="privacy" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Privacy Policy
            </TabsTrigger>
            <TabsTrigger value="terms" id="terms" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Terms of Service
            </TabsTrigger>
            <TabsTrigger value="disclaimer" id="disclaimer" className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Disclaimer
            </TabsTrigger>
          </TabsList>

          <TabsContent value="privacy">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Privacy Policy
                </CardTitle>
                <CardDescription>
                  How we collect, use, and protect your personal information
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div 
                  id="WTBaaWVrRXlTa0Y0UlRJMk1IYzlQUT09" 
                  className="policy_embed_div min-h-[480px]"
                > 
                  <p className="text-muted-foreground">
                    Please wait while the policy is loaded. If it does not load, please{' '}
                    <a 
                      rel="nofollow" 
                      href="https://policies.termageddon.com/api/policy/WTBaaWVrRXlTa0Y0UlRJMk1IYzlQUT09" 
                      target="_blank"
                      className="text-primary hover:underline"
                    >
                      click here
                    </a>
                    {' '}to view the policy.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="terms">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Terms of Service
                </CardTitle>
                <CardDescription>
                  The rules and guidelines for using our platform
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div 
                  id="UzB0a2RUWTJPVEJEYmswNE0wRTlQUT09" 
                  className="policy_embed_div min-h-[480px]"
                > 
                  <p className="text-muted-foreground">
                    Please wait while the policy is loaded. If it does not load, please{' '}
                    <a 
                      rel="nofollow" 
                      href="https://policies.termageddon.com/api/policy/UzB0a2RUWTJPVEJEYmswNE0wRTlQUT09" 
                      target="_blank"
                      className="text-primary hover:underline"
                    >
                      click here
                    </a>
                    {' '}to view the policy.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="disclaimer">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" />
                  Disclaimer
                </CardTitle>
                <CardDescription>
                  Important legal information about our service
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div 
                  id="ZWk4NE5GQmpabGt3Ym5CQ1oxRTlQUT09" 
                  className="policy_embed_div min-h-[480px]"
                > 
                  <p className="text-muted-foreground">
                    Please wait while the policy is loaded. If it does not load, please{' '}
                    <a 
                      rel="nofollow" 
                      href="https://policies.termageddon.com/api/policy/ZWk4NE5GQmpabGt3Ym5CQ1oxRTlQUT09" 
                      target="_blank"
                      className="text-primary hover:underline"
                    >
                      click here
                    </a>
                    {' '}to view the policy.
                  </p>
                </div>
                
                <div 
                  id="VkdWV2RIcFpaMkpOYlhCalltYzlQUT09" 
                  className="policy_embed_div min-h-[480px] mt-6"
                > 
                  <p className="text-muted-foreground">
                    Please wait while the policy is loaded. If it does not load, please{' '}
                    <a 
                      rel="nofollow" 
                      href="https://policies.termageddon.com/api/policy/VkdWV2RIcFpaMkpOYlhCalltYzlQUT09" 
                      target="_blank"
                      className="text-primary hover:underline"
                    >
                      click here
                    </a>
                    {' '}to view the policy.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Policies;