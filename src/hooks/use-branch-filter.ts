import { useStaffPermissions } from "./use-staff-permissions";

/**
 * Hook that provides branch filtering context for data queries.
 * If staff is assigned to a specific branch, returns that branch_id.
 * If staff has full access or no branch restriction, returns null (all branches).
 */
export function useBranchFilter() {
  const { branchId, hasFullAccess, isLoading } = useStaffPermissions();

  return {
    // The branch ID to filter by, or null for all branches
    filterBranchId: hasFullAccess ? null : branchId,
    // Whether the user is restricted to a specific branch
    isBranchRestricted: !hasFullAccess && !!branchId,
    // The actual branch ID (even if user has full access)
    assignedBranchId: branchId,
    isLoading,
  };
}

/**
 * Helper to apply branch filter to a Supabase query.
 * Usage: applyBranchFilter(query, filterBranchId, 'branch_id')
 */
export function applyBranchFilter<T extends { eq: (column: string, value: string) => T }>(
  query: T,
  branchId: string | null,
  columnName: string = 'branch_id'
): T {
  if (branchId) {
    return query.eq(columnName, branchId);
  }
  return query;
}
