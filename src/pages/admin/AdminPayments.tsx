import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { db } from "@/hooks/use-database";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { CreditCard, Search } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const AdminPayments = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: payments, isLoading } = useQuery({
    queryKey: ['all-payments'],
    queryFn: async () => {
      const { data, error } = await db
        .from('payment_uploads')
        .select(`
          *,
          tenants(name, business_type),
          packages(name, price, currency)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  const filteredPayments = payments?.filter(payment => {
    const matchesSearch = 
      payment.tenants?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.transaction_ref?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || payment.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { className: string, label: string }> = {
      pending: { className: "bg-warning/10 text-warning", label: "Pending" },
      approved: { className: "bg-success text-success-foreground", label: "Approved" },
      rejected: { className: "bg-destructive text-destructive-foreground", label: "Rejected" },
    };
    const config = variants[status] || variants.pending;
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Payments</h1>
          <p className="text-muted-foreground">View all payment submissions</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <CardTitle>All Payments</CardTitle>
              <CardDescription>
                {filteredPayments?.length || 0} total payment records
              </CardDescription>
            </div>
            <div className="flex gap-3">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search payments..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p>Loading payments...</p>
          ) : filteredPayments?.length === 0 ? (
            <div className="text-center py-12">
              <CreditCard className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No payments found</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tenant</TableHead>
                    <TableHead>Package</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Transaction Ref</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPayments?.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell className="font-medium">{payment.tenants?.name}</TableCell>
                      <TableCell>{payment.packages?.name}</TableCell>
                      <TableCell className="font-medium">
                        {new Intl.NumberFormat('en-UG', {
                          style: 'currency',
                          currency: payment.currency || 'UGX',
                          maximumFractionDigits: 0,
                        }).format(payment.amount)}
                      </TableCell>
                      <TableCell className="capitalize">{payment.payment_method}</TableCell>
                      <TableCell className="font-mono text-sm">{payment.transaction_ref}</TableCell>
                      <TableCell>{getStatusBadge(payment.status || 'pending')}</TableCell>
                      <TableCell>
                        {new Date(payment.created_at || '').toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminPayments;
