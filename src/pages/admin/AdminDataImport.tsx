import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { importUgandaLocationData } from "@/lib/uganda-location-importer";

export function AdminDataImport() {
  const navigate = useNavigate();
  const [isImporting, setIsImporting] = useState(false);
  const [status, setStatus] = useState<{
    type: "idle" | "loading" | "success" | "error";
    message: string;
    stats?: Record<string, number>;
  }>({
    type: "idle",
    message: "",
   });

  const handleImportUgandaData = async () => {
    setIsImporting(true);
    setStatus({ type: "loading", message: "Importing Uganda location data..." });

    try {
      const result = await importUgandaLocationData(supabase);

      if (result.success) {
        setStatus({
          type: "success",
          message: result.message,
          stats: result.stats,
        });
      } else {
        setStatus({
          type: "error",
          message: result.message,
        });
      }
    } catch (error) {
      setStatus({
        type: "error",
        message: `Failed to import data: ${error instanceof Error ? error.message : String(error)}`,
      });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Admin Data Import</h1>
        <p className="text-gray-600 mt-2">Manage and import system data</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Uganda Geographic Data</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600">
            Import districts, constituencies, and subcounties from the Uganda-Open-Data/kalulu repository.
          </p>
          <p className="text-sm text-gray-600">
            This data is used for student location selection in enrollment forms.
          </p>

          <div className="bg-gray-50 p-4 rounded-md text-sm space-y-2">
            <p className="font-semibold">What will be imported:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>All 146 Uganda districts (including cities)</li>
              <li>All constituencies/counties</li>
              <li>All subcounties/divisions</li>
              <li>Regional classifications</li>
            </ul>
          </div>

          {status.type !== "idle" && (
            <Alert variant={status.type === "error" ? "destructive" : "default"}>
              <div className="flex items-start gap-2">
                {status.type === "loading" && <Loader2 className="h-4 w-4 animate-spin mt-0.5" />}
                {status.type === "success" && <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />}
                {status.type === "error" && <AlertCircle className="h-4 w-4 mt-0.5" />}
                <div>
                  <AlertDescription>{status.message}</AlertDescription>
                  {status.stats && (
                    <div className="mt-2 text-sm space-y-1">
                      <p>Districts: {status.stats.districts}</p>
                      <p>Constituencies: {status.stats.constituencies}</p>
                      <p>Subcounties: {status.stats.subcounties}</p>
                    </div>
                  )}
                </div>
              </div>
            </Alert>
          )}

          <Button
            onClick={handleImportUgandaData}
            disabled={isImporting}
            className="w-full"
          >
            {isImporting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Importing...
              </>
            ) : (
              "Import Uganda Location Data"
            )}
          </Button>
        </CardContent>
      </Card>

      <div className="flex gap-4">
        <Button variant="outline" onClick={() => navigate(-1)}>
          Back
        </Button>
      </div>
    </div>
  );
}
