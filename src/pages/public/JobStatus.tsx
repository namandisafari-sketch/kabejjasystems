import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/hooks/use-database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wrench, Clock, CheckCircle, Package, Truck, Phone, X, Search, AlertCircle } from "lucide-react";
import { format } from "date-fns";

const statusConfig: Record<string, { label: string; color: string; bgColor: string; icon: React.ComponentType<{ className?: string }>; message: string }> = {
  pending: { 
    label: "Pending", 
    color: "text-yellow-700", 
    bgColor: "bg-yellow-100", 
    icon: Clock,
    message: "Your device has been received and is waiting to be assessed."
  },
  in_progress: { 
    label: "In Progress", 
    color: "text-blue-700", 
    bgColor: "bg-blue-100", 
    icon: Wrench,
    message: "Our technician is currently working on your device."
  },
  waiting_parts: { 
    label: "Waiting for Parts", 
    color: "text-orange-700", 
    bgColor: "bg-orange-100", 
    icon: Package,
    message: "We are waiting for replacement parts to arrive."
  },
  completed: { 
    label: "Repair Completed", 
    color: "text-green-700", 
    bgColor: "bg-green-100", 
    icon: CheckCircle,
    message: "Your device has been repaired successfully!"
  },
  ready: { 
    label: "Ready for Pickup", 
    color: "text-emerald-700", 
    bgColor: "bg-emerald-100", 
    icon: Phone,
    message: "Your device is ready! Please come pick it up."
  },
  delivered: { 
    label: "Delivered", 
    color: "text-purple-700", 
    bgColor: "bg-purple-100", 
    icon: Truck,
    message: "Your device has been delivered."
  },
  collected: { 
    label: "Collected", 
    color: "text-gray-700", 
    bgColor: "bg-gray-100", 
    icon: CheckCircle,
    message: "You have collected your device. Thank you!"
  },
  cancelled: { 
    label: "Cancelled", 
    color: "text-red-700", 
    bgColor: "bg-red-100", 
    icon: X,
    message: "This repair job has been cancelled."
  },
};

export default function JobStatus() {
  const [searchParams] = useSearchParams();
  const initialRef = searchParams.get("ref") || "";
  const [jobRef, setJobRef] = useState(initialRef);
  const [searchRef, setSearchRef] = useState(initialRef);

  const { data: job, isLoading, error } = useQuery({
    queryKey: ['public-job-status', searchRef],
    enabled: !!searchRef,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('repair_jobs')
        .select(`
          job_ref,
          device_type,
          device_model,
          status,
          created_at,
          due_date,
          completed_at,
          total_amount,
          amount_paid,
          balance_due,
          tenants(name, phone)
        `)
        .eq('job_ref', searchRef)
        .single();
      
      if (error) throw error;
      
      // Normalize tenants data (may come as array from self-hosted)
      const tenantData = Array.isArray(data?.tenants) ? data.tenants[0] : data?.tenants;
      return { ...data, tenants: tenantData };
    },
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchRef(jobRef.toUpperCase());
  };

  const statusInfo = job ? statusConfig[job.status] : null;
  const StatusIcon = statusInfo?.icon || AlertCircle;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 p-4">
      <div className="max-w-md mx-auto pt-8">
        {/* Header */}
        <div className="text-center mb-8">
          <Wrench className="h-12 w-12 mx-auto text-primary mb-2" />
          <h1 className="text-2xl font-bold">Job Status Tracker</h1>
          <p className="text-muted-foreground">Check the status of your repair</p>
        </div>

        {/* Search Form */}
        <form onSubmit={handleSearch} className="mb-6">
          <div className="flex gap-2">
            <Input
              value={jobRef}
              onChange={(e) => setJobRef(e.target.value.toUpperCase())}
              placeholder="Enter Job Reference (e.g., JOB-2025-00001)"
              className="font-mono"
            />
            <Button type="submit" disabled={!jobRef}>
              <Search className="h-4 w-4" />
            </Button>
          </div>
        </form>

        {/* Loading State */}
        {isLoading && (
          <Card>
            <CardContent className="py-8 text-center">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-2" />
              <p className="text-muted-foreground">Looking up your job...</p>
            </CardContent>
          </Card>
        )}

        {/* Error State */}
        {error && searchRef && (
          <Card className="border-destructive">
            <CardContent className="py-8 text-center">
              <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-2" />
              <p className="font-medium text-destructive">Job not found</p>
              <p className="text-sm text-muted-foreground mt-1">
                Please check the reference number and try again.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Job Details */}
        {job && statusInfo && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Job Reference</p>
                  <CardTitle className="font-mono">{job.job_ref}</CardTitle>
                </div>
                <Badge className={`${statusInfo.bgColor} ${statusInfo.color} border-0`}>
                  <StatusIcon className="h-3 w-3 mr-1" />
                  {statusInfo.label}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Status Message */}
              <div className={`p-4 rounded-lg ${statusInfo.bgColor}`}>
                <div className="flex items-start gap-3">
                  <StatusIcon className={`h-6 w-6 ${statusInfo.color} mt-0.5`} />
                  <div>
                    <p className={`font-medium ${statusInfo.color}`}>{statusInfo.label}</p>
                    <p className="text-sm mt-1">{statusInfo.message}</p>
                  </div>
                </div>
              </div>

              {/* Device Info */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Device</span>
                  <span className="font-medium">{job.device_type} {job.device_model || ''}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Received</span>
                  <span>{format(new Date(job.created_at), "dd MMM yyyy")}</span>
                </div>
                {job.due_date && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Expected Ready</span>
                    <span>{format(new Date(job.due_date), "dd MMM yyyy")}</span>
                  </div>
                )}
                {job.completed_at && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Completed</span>
                    <span>{format(new Date(job.completed_at), "dd MMM yyyy")}</span>
                  </div>
                )}
              </div>

              {/* Payment Info */}
              {(job.total_amount ?? 0) > 0 && (
                <div className="border-t pt-3 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Amount</span>
                    <span className="font-medium">{job.total_amount?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Amount Paid</span>
                    <span>{job.amount_paid?.toLocaleString() || 0}</span>
                  </div>
                  {(job.balance_due ?? 0) > 0 && (
                    <div className="flex justify-between text-sm font-bold">
                      <span>Balance Due</span>
                      <span className="text-destructive">{job.balance_due?.toLocaleString()}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Business Contact */}
              {job.tenants && (
                <div className="border-t pt-3 text-center text-sm text-muted-foreground">
                  <p className="font-medium text-foreground">{job.tenants.name}</p>
                  {job.tenants.phone && <p>{job.tenants.phone}</p>}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* No Search Yet */}
        {!searchRef && !isLoading && (
          <Card>
            <CardContent className="py-8 text-center">
              <Search className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">
                Enter your job reference number above to check the status.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
