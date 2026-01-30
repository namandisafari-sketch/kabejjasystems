import { supabase } from "@/integrations/supabase/client";

/**
 * Exam Results Management Utilities
 * Functions for school admins and superadmins to manage UNEB exam results
 */

// ============================================================================
// EXAM SESSION MANAGEMENT
// ============================================================================

/**
 * Create a new exam session
 * @param year - Exam year
 * @param level - Level (O-Level, A-Level, PLE, etc.)
 * @param sessionName - Session name
 * @param resultsReleasedDate - Date results are released
 */
export const createExamSession = async (
  year: number,
  level: string,
  sessionName: string,
  resultsReleasedDate?: string
) => {
  try {
    const { data, error } = await supabase
      .from('exam_sessions')
      .insert({
        year,
        level,
        session_name: sessionName,
        results_released_date: resultsReleasedDate,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating exam session:', error);
    throw error;
  }
};

/**
 * Get all active exam sessions
 */
export const getExamSessions = async () => {
  try {
    const { data, error } = await supabase
      .from('exam_sessions')
      .select('*')
      .eq('is_active', true)
      .order('year', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching exam sessions:', error);
    return [];
  }
};

// ============================================================================
// EXAM RESULTS MANAGEMENT
// ============================================================================

/**
 * Import exam results for a school
 * @param results - Array of exam results with subjects
 * @param sessionId - Exam session ID
 */
export const importExamResults = async (
  results: any[],
  sessionId: string
) => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("Not authenticated");

    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('id', session.user.id)
      .single();

    if (!profile?.tenant_id) throw new Error("School not found");

    // Insert results in batch
    const { data, error } = await supabase
      .from('exam_results')
      .insert(
        results.map((result) => ({
          index_number: result.indexNumber.toUpperCase(),
          exam_session_id: sessionId,
          student_name: result.studentName,
          school_name: result.schoolName,
          school_id: profile.tenant_id,
          subjects: result.subjects, // JSON array
          total_points: result.totalPoints,
          aggregate_grade: result.aggregateGrade,
          result_status: 'published',
        }))
      )
      .select();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error importing exam results:', error);
    throw error;
  }
};

/**
 * Get exam result by ID
 */
export const getExamResult = async (resultId: string) => {
  try {
    const { data, error } = await supabase
      .from('exam_results')
      .select('*')
      .eq('id', resultId)
      .eq('result_status', 'published')
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching exam result:', error);
    return null;
  }
};

/**
 * Search for exam results by index number and session
 */
export const searchExamResults = async (
  indexNumber: string,
  sessionId: string
) => {
  try {
    const { data, error } = await supabase
      .from('exam_results')
      .select('*')
      .eq('index_number', indexNumber.toUpperCase())
      .eq('exam_session_id', sessionId)
      .eq('result_status', 'published')
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error searching exam results:', error);
    return null;
  }
};

// ============================================================================
// BLOCK MANAGEMENT
// ============================================================================

/**
 * Block a student's exam result
 */
export const blockExamResult = async (
  indexNumber: string,
  reason: string,
  notes?: string,
  expiresInDays?: number
) => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("Not authenticated");

    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('id', session.user.id)
      .single();

    if (!profile?.tenant_id) throw new Error("School not found");

    // Find exam result
    const { data: result, error: resultError } = await supabase
      .from('exam_results')
      .select('id')
      .eq('index_number', indexNumber.toUpperCase())
      .eq('school_id', profile.tenant_id)
      .single();

    if (resultError || !result) {
      throw new Error('Exam result not found');
    }

    // Calculate expiry
    let expiresAt = null;
    if (expiresInDays && expiresInDays > 0) {
      const date = new Date();
      date.setDate(date.getDate() + expiresInDays);
      expiresAt = date.toISOString();
    }

    // Create block
    const { data, error } = await supabase
      .from('exam_result_blocks')
      .insert({
        exam_result_id: result.id,
        school_id: profile.tenant_id,
        index_number: indexNumber.toUpperCase(),
        reason,
        notes,
        blocked_by: session.user.id,
        expires_at: expiresAt,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error blocking exam result:', error);
    throw error;
  }
};

/**
 * Unblock a student's exam result
 */
export const unblockExamResult = async (blockId: string) => {
  try {
    const { error } = await supabase
      .from('exam_result_blocks')
      .delete()
      .eq('id', blockId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error unblocking exam result:', error);
    throw error;
  }
};

/**
 * Get all blocks for a school
 */
export const getSchoolBlocks = async () => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("Not authenticated");

    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('id', session.user.id)
      .single();

    if (!profile?.tenant_id) throw new Error("School not found");

    const { data, error } = await supabase
      .from('exam_result_blocks')
      .select('*')
      .eq('school_id', profile.tenant_id)
      .order('blocked_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching blocks:', error);
    return [];
  }
};

/**
 * Check if a result is blocked
 */
export const isResultBlocked = async (resultId: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('exam_result_blocks')
      .select('*')
      .eq('exam_result_id', resultId)
      .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
      .single();

    if (error) return false; // Not found = not blocked
    return !!data;
  } catch (error) {
    console.error('Error checking block:', error);
    return false;
  }
};

/**
 * Get block details for a result
 */
export const getBlockDetails = async (resultId: string) => {
  try {
    const { data, error } = await supabase
      .from('exam_result_blocks')
      .select('*')
      .eq('exam_result_id', resultId)
      .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
      .single();

    if (error) return null;
    return data;
  } catch (error) {
    console.error('Error fetching block details:', error);
    return null;
  }
};

// ============================================================================
// ACCESS LOGGING
// ============================================================================

/**
 * Log exam access attempt
 */
export const logExamAccess = async (
  indexNumber: string,
  sessionId: string,
  status: 'success' | 'blocked' | 'not_found'
) => {
  try {
    await supabase
      .from('exam_access_logs')
      .insert({
        index_number: indexNumber,
        exam_session_id: sessionId,
        access_status: status,
        ip_address: 'client',
        user_agent: navigator.userAgent,
      });
  } catch (error) {
    console.error('Error logging access:', error);
  }
};

/**
 * Get access logs (superadmin only)
 */
export const getAccessLogs = async (
  indexNumber?: string,
  sessionId?: string
) => {
  try {
    let query = supabase
      .from('exam_access_logs')
      .select('*')
      .order('accessed_at', { ascending: false });

    if (indexNumber) {
      query = query.eq('index_number', indexNumber);
    }

    if (sessionId) {
      query = query.eq('exam_session_id', sessionId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching access logs:', error);
    return [];
  }
};

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Calculate aggregate grade from subjects
 */
export const calculateAggregateGrade = (subjects: any[]): string => {
  const points = subjects.reduce((sum, s) => sum + (s.points || 0), 0);

  // Uganda grading scale
  if (points <= 8) return 'A';
  if (points <= 11) return 'B';
  if (points <= 17) return 'C';
  if (points <= 22) return 'D';
  return 'E';
};

/**
 * Format exam results for CSV export
 */
export const formatResultsForCSV = (results: any[]): string => {
  const headers = [
    'Index Number',
    'Student Name',
    'School',
    'Subjects',
    'Aggregate Grade',
    'Total Points',
  ];

  const rows = results.map((r) => [
    r.index_number,
    r.student_name,
    r.school_name || 'N/A',
    r.subjects?.length || 0,
    r.aggregate_grade,
    r.total_points,
  ]);

  return [
    headers.join(','),
    ...rows.map((r) => r.join(',')),
  ].join('\n');
};
