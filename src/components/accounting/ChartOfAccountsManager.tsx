import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Search, Settings, CheckCircle } from 'lucide-react';
import { 
  getChartOfAccounts, 
  initializeChartOfAccounts, 
  createCustomAccount,
  DEFAULT_CHART_OF_ACCOUNTS,
  ChartAccount
} from '@/lib/accounting/chart-of-accounts';
import { formatUGX } from '@/lib/accounting';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface ChartOfAccountsManagerProps {
  tenantId: string;
}

export function ChartOfAccountsManager({ tenantId }: ChartOfAccountsManagerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newAccount, setNewAccount] = useState<Partial<ChartAccount>>({
    account_type: 'EXPENSE',
    sub_type: 'OPERATING_EXPENSE'
  });
  
  const queryClient = useQueryClient();

  // Fetch chart of accounts
  const { data: accounts, isLoading, refetch } = useQuery({
    queryKey: ['chart-of-accounts', tenantId],
    queryFn: () => getChartOfAccounts(tenantId),
    enabled: !!tenantId,
  });

  // Initialize chart of accounts
  const initializeMutation = useMutation({
    mutationFn: () => initializeChartOfAccounts(tenantId),
    onSuccess: () => {
      toast.success('Chart of accounts initialized successfully');
      refetch();
    },
    onError: (error: any) => {
      toast.error('Failed to initialize: ' + error.message);
    },
  });

  // Add new account
  const addAccountMutation = useMutation({
    mutationFn: (account: ChartAccount) => createCustomAccount(tenantId, account),
    onSuccess: () => {
      toast.success('Account added successfully');
      setIsAddDialogOpen(false);
      setNewAccount({ account_type: 'EXPENSE', sub_type: 'OPERATING_EXPENSE' });
      queryClient.invalidateQueries({ queryKey: ['chart-of-accounts', tenantId] });
    },
    onError: (error: any) => {
      toast.error('Failed to add account: ' + error.message);
    },
  });

  // Filter accounts
  const filteredAccounts = accounts?.filter(account => {
    const matchesSearch = account.account_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      account.account_code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || account.account_type === filterType;
    return matchesSearch && matchesType;
  });

  // Group accounts by type
  const groupedAccounts = filteredAccounts?.reduce((acc, account) => {
    const type = account.account_type;
    if (!acc[type]) acc[type] = [];
    acc[type].push(account);
    return acc;
  }, {} as Record<string, typeof accounts>);

  const accountTypes = ['ASSET', 'LIABILITY', 'EQUITY', 'INCOME', 'EXPENSE'];
  const subTypes: Record<string, string[]> = {
    ASSET: ['CURRENT_ASSET', 'FIXED_ASSET'],
    LIABILITY: ['CURRENT_LIABILITY', 'LONG_TERM_LIABILITY'],
    EQUITY: ['OWNER_EQUITY'],
    INCOME: ['OPERATING_REVENUE', 'NON_OPERATING_REVENUE'],
    EXPENSE: ['OPERATING_EXPENSE', 'NON_OPERATING_EXPENSE'],
  };

  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'ASSET': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'LIABILITY': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'EQUITY': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
      case 'INCOME': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'EXPENSE': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300';
      default: return '';
    }
  };

  const handleAddAccount = () => {
    if (!newAccount.account_code || !newAccount.account_name || !newAccount.account_type) {
      toast.error('Please fill in all required fields');
      return;
    }
    addAccountMutation.mutate(newAccount as ChartAccount);
  };

  if (!accounts?.length && !isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Chart of Accounts
          </CardTitle>
          <CardDescription>
            Set up your chart of accounts to start tracking financial transactions
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center py-8">
          <p className="text-muted-foreground mb-4">
            No accounts found. Initialize the standard chart of accounts to get started.
          </p>
          <Button 
            onClick={() => initializeMutation.mutate()}
            disabled={initializeMutation.isPending}
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            {initializeMutation.isPending ? 'Initializing...' : 'Initialize Chart of Accounts'}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Chart of Accounts
            </CardTitle>
            <CardDescription>
              Manage your accounting structure ({accounts?.length || 0} accounts)
            </CardDescription>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Account
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Account</DialogTitle>
                <DialogDescription>
                  Create a custom account for your chart of accounts
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Account Code</Label>
                    <Input
                      placeholder="e.g., CUSTOM_EXP"
                      value={newAccount.account_code || ''}
                      onChange={(e) => setNewAccount({ ...newAccount, account_code: e.target.value.toUpperCase() })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Account Type</Label>
                    <Select
                      value={newAccount.account_type}
                      onValueChange={(value) => setNewAccount({ 
                        ...newAccount, 
                        account_type: value as ChartAccount['account_type'],
                        sub_type: subTypes[value]?.[0] || ''
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        {accountTypes.map(type => (
                          <SelectItem key={type} value={type}>{type}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Account Name</Label>
                  <Input
                    placeholder="e.g., Custom Expense"
                    value={newAccount.account_name || ''}
                    onChange={(e) => setNewAccount({ ...newAccount, account_name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Sub Type</Label>
                  <Select
                    value={newAccount.sub_type}
                    onValueChange={(value) => setNewAccount({ ...newAccount, sub_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select sub-type" />
                    </SelectTrigger>
                    <SelectContent>
                      {(subTypes[newAccount.account_type || 'EXPENSE'] || []).map(type => (
                        <SelectItem key={type} value={type}>{type.replace(/_/g, ' ')}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Description (Optional)</Label>
                  <Input
                    placeholder="Account description"
                    value={newAccount.description || ''}
                    onChange={(e) => setNewAccount({ ...newAccount, description: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleAddAccount} disabled={addAccountMutation.isPending}>
                  {addAccountMutation.isPending ? 'Adding...' : 'Add Account'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search accounts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {accountTypes.map(type => (
                <SelectItem key={type} value={type}>{type}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Accounts Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Sub-Type</TableHead>
                <TableHead className="text-right">Balance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAccounts?.map((account) => (
                <TableRow key={account.id}>
                  <TableCell className="font-mono text-sm">{account.account_code}</TableCell>
                  <TableCell>{account.account_name}</TableCell>
                  <TableCell>
                    <Badge className={getTypeBadgeColor(account.account_type)}>
                      {account.account_type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {account.sub_type?.replace(/_/g, ' ')}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatUGX(account.balance || 0)}
                  </TableCell>
                </TableRow>
              ))}
              {!filteredAccounts?.length && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    No accounts found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

export default ChartOfAccountsManager;
