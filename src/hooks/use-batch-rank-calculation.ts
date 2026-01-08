import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ReportCardWithScore {
  id: string;
  student_id: string;
  average_score: number | null;
}

export function useBatchRankCalculation() {
  const queryClient = useQueryClient();

  const calculateRanksMutation = useMutation({
    mutationFn: async ({ termId, classId, tenantId }: { termId: string; classId?: string; tenantId: string }) => {
      // Fetch all report cards for the term (optionally filtered by class)
      let query = supabase
        .from('ecd_report_cards')
        .select('id, student_id, average_score, class_id')
        .eq('term_id', termId)
        .eq('tenant_id', tenantId)
        .not('average_score', 'is', null);

      if (classId) {
        query = query.eq('class_id', classId);
      }

      const { data: reportCards, error } = await query;

      if (error) throw error;
      if (!reportCards || reportCards.length === 0) {
        throw new Error('No report cards found with scores');
      }

      // Group by class for ranking within each class
      const byClass: Record<string, ReportCardWithScore[]> = {};
      reportCards.forEach(rc => {
        const cId = rc.class_id || 'unknown';
        if (!byClass[cId]) byClass[cId] = [];
        byClass[cId].push(rc as ReportCardWithScore);
      });

      // Calculate ranks for each class
      const updates: { id: string; class_rank: number; total_students_in_class: number }[] = [];

      for (const classCards of Object.values(byClass)) {
        // Sort by average score descending
        const sorted = [...classCards].sort((a, b) => (b.average_score || 0) - (a.average_score || 0));
        const totalStudents = sorted.length;

        sorted.forEach((card, index) => {
          // Handle ties - same score gets same rank
          let rank = index + 1;
          if (index > 0 && card.average_score === sorted[index - 1].average_score) {
            // Same score as previous, give same rank
            const prevUpdate = updates.find(u => u.id === sorted[index - 1].id);
            if (prevUpdate) rank = prevUpdate.class_rank;
          }

          updates.push({
            id: card.id,
            class_rank: rank,
            total_students_in_class: totalStudents,
          });
        });
      }

      // Batch update all report cards
      for (const update of updates) {
        const { error: updateError } = await supabase
          .from('ecd_report_cards')
          .update({
            class_rank: update.class_rank,
            total_students_in_class: update.total_students_in_class,
          })
          .eq('id', update.id);

        if (updateError) throw updateError;
      }

      return updates.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['ecd-report-cards'] });
      toast.success(`Calculated ranks for ${count} report cards`);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const calculateAveragesMutation = useMutation({
    mutationFn: async ({ reportCardId, tenantId }: { reportCardId: string; tenantId: string }) => {
      // Fetch all learning ratings for this report card
      const { data: ratings, error } = await supabase
        .from('ecd_learning_ratings')
        .select('numeric_score')
        .eq('report_card_id', reportCardId)
        .not('numeric_score', 'is', null);

      if (error) throw error;

      if (!ratings || ratings.length === 0) {
        return null;
      }

      // Calculate average
      const scores = ratings.map(r => r.numeric_score!).filter(s => s !== null);
      const average = scores.reduce((sum, s) => sum + s, 0) / scores.length;

      // Update report card
      const { error: updateError } = await supabase
        .from('ecd_report_cards')
        .update({ average_score: Math.round(average * 100) / 100 })
        .eq('id', reportCardId);

      if (updateError) throw updateError;

      return average;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ecd-report-cards'] });
    },
  });

  const batchCalculateAveragesMutation = useMutation({
    mutationFn: async ({ termId, tenantId }: { termId: string; tenantId: string }) => {
      // Get all report cards for the term
      const { data: reportCards, error } = await supabase
        .from('ecd_report_cards')
        .select('id')
        .eq('term_id', termId)
        .eq('tenant_id', tenantId);

      if (error) throw error;
      if (!reportCards) return 0;

      let updated = 0;

      for (const rc of reportCards) {
        // Fetch ratings
        const { data: ratings } = await supabase
          .from('ecd_learning_ratings')
          .select('numeric_score')
          .eq('report_card_id', rc.id)
          .not('numeric_score', 'is', null);

        if (ratings && ratings.length > 0) {
          const scores = ratings.map(r => r.numeric_score!);
          const average = scores.reduce((sum, s) => sum + s, 0) / scores.length;

          await supabase
            .from('ecd_report_cards')
            .update({ average_score: Math.round(average * 100) / 100 })
            .eq('id', rc.id);

          updated++;
        }
      }

      return updated;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['ecd-report-cards'] });
      toast.success(`Calculated averages for ${count} report cards`);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  return {
    calculateRanks: calculateRanksMutation.mutate,
    isCalculatingRanks: calculateRanksMutation.isPending,
    calculateAverage: calculateAveragesMutation.mutate,
    batchCalculateAverages: batchCalculateAveragesMutation.mutate,
    isBatchCalculating: batchCalculateAveragesMutation.isPending,
  };
}
