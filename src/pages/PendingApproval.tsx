import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/i18n";

const PendingApproval = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-gradient-to-br from-muted/30 to-muted/10 flex items-center justify-center p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-warning/10 flex items-center justify-center">
            <Clock className="h-8 w-8 text-warning" />
          </div>
          <CardTitle className="text-2xl">{t.pages.pendingApproval.title}</CardTitle>
          <CardDescription>
            {t.pages.pendingApproval.description}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            {t.pages.pendingApproval.details}
          </p>
          
          <div className="bg-muted/50 rounded-lg p-4 text-left">
            <h4 className="font-semibold mb-2">{t.pages.pendingApproval.whatsNext}</h4>
            <ul className="text-sm space-y-1 text-muted-foreground">
              <li>✓ {t.pages.pendingApproval.steps[0]}</li>
              <li>✓ {t.pages.pendingApproval.steps[1]}</li>
              <li>✓ {t.pages.pendingApproval.steps[2]}</li>
              <li>✓ {t.pages.pendingApproval.steps[3]}</li>
            </ul>
          </div>
          
          <p className="text-sm text-muted-foreground">
            {t.pages.pendingApproval.contact}
          </p>

          {/* Dev Mode Shortcuts */}
          {import.meta.env.DEV && (
            <div className="pt-4 space-y-2 border-t border-dashed border-orange-500">
              <p className="text-xs text-orange-500 font-medium">Dev Mode</p>
              <Button 
                variant="outline"
                onClick={() => navigate('/business', { state: { devBusinessType: 'pharmacy', devBusinessName: 'Dev Pharmacy' } })}
                className="w-full border-dashed border-orange-500 text-orange-500 hover:bg-orange-500/10"
              >
                🚀 Skip to Pharmacy Dashboard
              </Button>
              <Button 
                variant="outline"
                onClick={() => navigate('/admin')}
                className="w-full border-dashed border-orange-500 text-orange-500 hover:bg-orange-500/10"
              >
                👤 Go to Admin Panel
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PendingApproval;