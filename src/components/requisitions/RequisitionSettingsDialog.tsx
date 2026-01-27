import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRequisitionSettings, useUpdateRequisitionSettings, ApproverRole } from "@/hooks/use-requisitions";
import { Loader2 } from "lucide-react";

const formSchema = z.object({
  approval_levels: z.coerce.number().min(1).max(3),
  level1_role: z.enum(['hod', 'bursar', 'head_teacher', 'director', 'admin']),
  level1_label: z.string().min(1),
  level2_role: z.enum(['hod', 'bursar', 'head_teacher', 'director', 'admin']),
  level2_label: z.string().min(1),
  level3_role: z.enum(['hod', 'bursar', 'head_teacher', 'director', 'admin']).optional().nullable(),
  level3_label: z.string().optional().nullable(),
  auto_approve_below: z.coerce.number().optional().nullable(),
  require_receipt_for_advance: z.boolean(),
  max_advance_amount: z.coerce.number().optional().nullable(),
});

type FormData = z.infer<typeof formSchema>;

const roleOptions: { value: ApproverRole; label: string }[] = [
  { value: 'hod', label: 'Head of Department' },
  { value: 'bursar', label: 'Bursar' },
  { value: 'head_teacher', label: 'Head Teacher' },
  { value: 'director', label: 'Director' },
  { value: 'admin', label: 'Administrator' },
];

interface RequisitionSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RequisitionSettingsDialog({ open, onOpenChange }: RequisitionSettingsDialogProps) {
  const { data: settings, isLoading } = useRequisitionSettings();
  const updateSettings = useUpdateRequisitionSettings();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      approval_levels: 2,
      level1_role: 'bursar',
      level1_label: 'Bursar Approval',
      level2_role: 'head_teacher',
      level2_label: 'Head Teacher Approval',
      level3_role: null,
      level3_label: null,
      auto_approve_below: null,
      require_receipt_for_advance: true,
      max_advance_amount: null,
    },
  });

  useEffect(() => {
    if (settings) {
      form.reset({
        approval_levels: settings.approval_levels,
        level1_role: settings.level1_role,
        level1_label: settings.level1_label,
        level2_role: settings.level2_role,
        level2_label: settings.level2_label,
        level3_role: settings.level3_role,
        level3_label: settings.level3_label,
        auto_approve_below: settings.auto_approve_below,
        require_receipt_for_advance: settings.require_receipt_for_advance,
        max_advance_amount: settings.max_advance_amount,
      });
    }
  }, [settings, form]);

  const approvalLevels = form.watch('approval_levels');

  const onSubmit = async (data: FormData) => {
    await updateSettings.mutateAsync(data as any);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Requisition Settings</DialogTitle>
          <DialogDescription>
            Configure the approval workflow and limits for requisitions
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="approval_levels"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Number of Approval Levels</FormLabel>
                    <Select 
                      onValueChange={(v) => field.onChange(parseInt(v))} 
                      value={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="1">1 Level (Single Approval)</SelectItem>
                        <SelectItem value="2">2 Levels</SelectItem>
                        <SelectItem value="3">3 Levels</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      How many approvals are required before a requisition is approved
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Level 1 */}
              <div className="space-y-4 p-4 border rounded-lg">
                <h4 className="font-medium">Level 1 Approval</h4>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="level1_role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Approver Role</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {roleOptions.map((role) => (
                              <SelectItem key={role.value} value={role.value}>
                                {role.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="level1_label"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Display Label</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="e.g. Bursar Approval" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Level 2 */}
              {approvalLevels >= 2 && (
                <div className="space-y-4 p-4 border rounded-lg">
                  <h4 className="font-medium">Level 2 Approval</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="level2_role"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Approver Role</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {roleOptions.map((role) => (
                                <SelectItem key={role.value} value={role.value}>
                                  {role.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="level2_label"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Display Label</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g. Head Teacher Approval" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              )}

              {/* Level 3 */}
              {approvalLevels >= 3 && (
                <div className="space-y-4 p-4 border rounded-lg">
                  <h4 className="font-medium">Level 3 Approval</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="level3_role"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Approver Role</FormLabel>
                          <Select 
                            onValueChange={field.onChange} 
                            value={field.value || undefined}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select role" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {roleOptions.map((role) => (
                                <SelectItem key={role.value} value={role.value}>
                                  {role.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="level3_label"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Display Label</FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value || ''} placeholder="e.g. Director Approval" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              )}

              <div className="space-y-4 pt-4 border-t">
                <h4 className="font-medium">Limits & Rules</h4>
                
                <FormField
                  control={form.control}
                  name="auto_approve_below"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Auto-Approve Below (UGX)</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          type="number" 
                          value={field.value || ''} 
                          placeholder="Leave blank to disable" 
                        />
                      </FormControl>
                      <FormDescription>
                        Requisitions below this amount can be auto-approved
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="max_advance_amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Maximum Advance Amount (UGX)</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          type="number" 
                          value={field.value || ''} 
                          placeholder="Leave blank for no limit" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="require_receipt_for_advance"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <FormLabel>Require Receipt for Advances</FormLabel>
                        <FormDescription>
                          Staff must submit receipts after using cash advances
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateSettings.isPending}>
                  {updateSettings.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Save Settings
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
