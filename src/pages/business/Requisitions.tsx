import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Plus, FileText, Clock, CheckCircle, XCircle, AlertCircle, 
  Loader2, Filter, Search, Settings2 
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { useRequisitions, RequisitionStatus } from "@/hooks/use-requisitions";
import { RequisitionDialog } from "@/components/requisitions/RequisitionDialog";
import { RequisitionDetailsDialog } from "@/components/requisitions/RequisitionDetailsDialog";
import { RequisitionSettingsDialog } from "@/components/requisitions/RequisitionSettingsDialog";
import { format } from "date-fns";

const statusConfig: Record<RequisitionStatus, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  draft: { label: 'Draft', color: 'bg-muted text-muted-foreground', icon: FileText },
  pending_level1: { label: 'Pending L1', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200', icon: Clock },
  pending_level2: { label: 'Pending L2', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200', icon: Clock },
  pending_level3: { label: 'Pending L3', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200', icon: Clock },
  approved: { label: 'Approved', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200', icon: CheckCircle },
  partially_approved: { label: 'Partial', color: 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200', icon: CheckCircle },
  rejected: { label: 'Rejected', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200', icon: XCircle },
  cancelled: { label: 'Cancelled', color: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200', icon: AlertCircle },
};

const typeLabels: Record<string, string> = {
  cash_advance: 'Cash Advance',
  reimbursement: 'Reimbursement',
  purchase_request: 'Purchase Request',
};

export default function Requisitions() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [selectedRequisitionId, setSelectedRequisitionId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  
  const { data: requisitions, isLoading } = useRequisitions();

  const filteredRequisitions = requisitions?.filter(req => {
    const matchesSearch = 
      req.requisition_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.requester_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.purpose.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (activeTab === 'all') return matchesSearch;
    if (activeTab === 'pending') return matchesSearch && req.status.startsWith('pending');
    if (activeTab === 'approved') return matchesSearch && (req.status === 'approved' || req.status === 'partially_approved');
    if (activeTab === 'rejected') return matchesSearch && req.status === 'rejected';
    if (activeTab === 'draft') return matchesSearch && req.status === 'draft';
    return matchesSearch;
  }) || [];

  const stats = {
    total: requisitions?.length || 0,
    pending: requisitions?.filter(r => r.status.startsWith('pending')).length || 0,
    approved: requisitions?.filter(r => r.status === 'approved' || r.status === 'partially_approved').length || 0,
    totalAmount: requisitions?.reduce((sum, r) => sum + (r.amount_requested || 0), 0) || 0,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Requisitions</h1>
          <p className="text-muted-foreground">Manage staff requisitions and approvals</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setIsSettingsOpen(true)}>
            <Settings2 className="h-4 w-4 mr-2" />
            Settings
          </Button>
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Requisition
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Total Requisitions</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
            <p className="text-xs text-muted-foreground">Pending Approval</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
            <p className="text-xs text-muted-foreground">Approved</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">UGX {stats.totalAmount.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Total Requested</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search requisitions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="draft">Drafts</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredRequisitions.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-medium">No requisitions found</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {searchQuery ? 'Try a different search term' : 'Create your first requisition to get started'}
                </p>
                {!searchQuery && (
                  <Button className="mt-4" onClick={() => setIsCreateOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    New Requisition
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredRequisitions.map((requisition) => {
                const status = statusConfig[requisition.status];
                const StatusIcon = status.icon;
                
                return (
                  <Card 
                    key={requisition.id} 
                    className="cursor-pointer hover:border-primary/50 transition-colors"
                    onClick={() => setSelectedRequisitionId(requisition.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-mono text-sm font-medium">{requisition.requisition_number}</span>
                            <Badge variant="outline" className="text-xs">
                              {typeLabels[requisition.requisition_type]}
                            </Badge>
                          </div>
                          <h3 className="font-medium truncate">{requisition.purpose}</h3>
                          <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                            <span>{requisition.requester_name}</span>
                            <span>{format(new Date(requisition.created_at), 'MMM d, yyyy')}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className="font-semibold">
                              UGX {requisition.amount_requested.toLocaleString()}
                            </div>
                            {requisition.amount_approved && requisition.amount_approved !== requisition.amount_requested && (
                              <div className="text-sm text-green-600">
                                Approved: UGX {requisition.amount_approved.toLocaleString()}
                              </div>
                            )}
                          </div>
                          <Badge className={`${status.color} flex items-center gap-1`}>
                            <StatusIcon className="h-3 w-3" />
                            {status.label}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <RequisitionDialog 
        open={isCreateOpen} 
        onOpenChange={setIsCreateOpen}
      />
      
      <RequisitionDetailsDialog
        requisitionId={selectedRequisitionId}
        open={!!selectedRequisitionId}
        onOpenChange={(open) => !open && setSelectedRequisitionId(null)}
      />
      
      <RequisitionSettingsDialog
        open={isSettingsOpen}
        onOpenChange={setIsSettingsOpen}
      />
    </div>
  );
}
