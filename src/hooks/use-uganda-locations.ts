import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface UgandaDistrict {
  district_code: number;
  district_name: string;
  region_code: number;
  region_name: string;
}

export interface UgandaConstituency {
  constituency_code: number;
  constituency_name: string;
  district_code: number;
}

export interface UgandaSubcounty {
  id: string;
  subcounty_code: number;
  subcounty_name: string;
  district_code: number;
  constituency_code: number;
}

const REGIONS = [
  { code: 1, name: "Central" },
  { code: 2, name: "Eastern" },
  { code: 3, name: "Northern" },
  { code: 4, name: "Western" },
];

export function useUgandaDistricts() {
  return useQuery({
    queryKey: ['uganda-districts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('uganda_districts')
        .select('*')
        .order('district_name', { ascending: true });
      if (error) throw error;
      return data as UgandaDistrict[];
    },
    staleTime: 1000 * 60 * 60,
  });
}

export function useUgandaConstituencies(districtCode?: number | null) {
  return useQuery({
    queryKey: ['uganda-constituencies', districtCode],
    enabled: !!districtCode,
    queryFn: async () => {
      let query = supabase
        .from('uganda_constituencies')
        .select('*')
        .order('constituency_name', { ascending: true });
      if (districtCode) {
        query = query.eq('district_code', districtCode);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data as UgandaConstituency[];
    },
    staleTime: 1000 * 60 * 60,
  });
}

export function useUgandaSubcounties(constituencyCode?: number | null) {
  return useQuery({
    queryKey: ['uganda-subcounties', constituencyCode],
    enabled: !!constituencyCode,
    queryFn: async () => {
      let query = supabase
        .from('uganda_subcounties')
        .select('*')
        .order('subcounty_name', { ascending: true });
      if (constituencyCode) {
        query = query.eq('constituency_code', constituencyCode);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data as UgandaSubcounty[];
    },
    staleTime: 1000 * 60 * 60,
  });
}

export function useRegionName(code: number): string {
  return REGIONS.find(r => r.code === code)?.name ?? "";
}

export const REGION_OPTIONS = REGIONS;
