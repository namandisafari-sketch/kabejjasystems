import { useMutation, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  createEvolutionClient,
  type CreateInstanceRequest,
  type SendTextRequest,
  type SendTextResponse,
} from "@/integrations/evolution-api";

export function useCreateInstance() {
  return useMutation({
    mutationFn: (data: CreateInstanceRequest) => {
      const client = createEvolutionClient();
      return client.createInstance(data);
    },
  });
}

export function useConnectInstance() {
  return useMutation({
    mutationFn: (instanceName?: string) => {
      const client = createEvolutionClient();
      return client.connectInstance(instanceName);
    },
  });
}

export function useConnectionState(instanceName?: string) {
  return useQuery({
    queryKey: ["evolution-connection-state", instanceName],
    queryFn: () => {
      const client = createEvolutionClient();
      return client.connectionState(instanceName);
    },
    enabled: !!instanceName,
    refetchInterval: 5000,
  });
}

export function useSendWhatsApp() {
  return useMutation({
    mutationFn: async (data: SendTextRequest): Promise<SendTextResponse> => {
      const { data: result, error } = await supabase.functions.invoke("send-whatsapp", {
        body: data,
      });
      if (error) throw error;
      return result;
    },
  });
}

export function useLogoutInstance() {
  return useMutation({
    mutationFn: (instanceName?: string) => {
      const client = createEvolutionClient();
      return client.logoutInstance(instanceName);
    },
  });
}

export function useFetchInstances() {
  return useMutation({
    mutationFn: () => {
      const client = createEvolutionClient();
      return client.fetchInstances();
    },
  });
}
