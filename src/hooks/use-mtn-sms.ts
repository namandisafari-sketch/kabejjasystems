import { useMutation } from "@tanstack/react-query";
import { sendSms, createSubscription, deleteSubscription } from "@/integrations/mtn-sms";
import type { OutboundSmsMessageRequest, ShortCodeSubscription } from "@/integrations/mtn-sms";

export function useSendSms() {
  return useMutation({
    mutationFn: (request: OutboundSmsMessageRequest) => sendSms(request),
  });
}

export function useCreateSubscription() {
  return useMutation({
    mutationFn: (data: { subscription: ShortCodeSubscription; transactionId?: string }) =>
      createSubscription(data.subscription, data.transactionId),
  });
}

export function useDeleteSubscription() {
  return useMutation({
    mutationFn: (data: { subscriptionId: string; transactionId?: string }) =>
      deleteSubscription(data.subscriptionId, data.transactionId),
  });
}
