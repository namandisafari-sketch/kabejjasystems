export interface MtnOAuthTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export interface OutboundSmsMessageRequest {
  senderAddress?: string;
  receiverAddress: string[];
  message: string;
  clientCorrelatorId: string;
  keyword?: string;
  serviceCode: string;
  requestDeliveryReceipt?: boolean;
}

export interface ResourceReferenceData {
  status: string;
}

export interface ResourceReference {
  statusCode: string;
  statusMessage: string;
  transactionId: string;
  data: ResourceReferenceData;
}

export type DeliveryStatus =
  | "ACCEPTD"
  | "DELETED"
  | "DELIVERED"
  | "ENROUTE"
  | "UNKNOWN"
  | "EXPIRED"
  | "REJECTED"
  | "UNDELIVERED";

export interface DeliveryNotificationRequest {
  clientCorrelatorId: string;
  deliveryStatus: DeliveryStatus;
  details?: string;
  completedDate?: string;
  id?: number;
  error?: string;
  senderAddress?: string;
  receiverAddress?: string;
  submittedDate?: string;
}

export interface ShortCodeSubscription {
  callbackUrl: string;
  targetSystem: string;
  deliveryReportUrl?: string;
  serviceCode: string;
}

export interface UpdateSubscriptionRequest {
  serviceCode?: string;
  callbackUrl?: string;
  deliveryReportUrl?: string;
  targetSystem?: string;
  keywords?: string[];
}

export interface SubscriptionData {
  subscriptionId: string;
}

export interface SubscriptionResponse {
  statusCode: string;
  statusMessage: string;
  transactionId: string;
  data: SubscriptionData;
}

export interface OutboundSubscriptionDeleteData {
  subscriptionId: string;
}

export interface OutboundSubscriptionDeleteResponse {
  statusCode: string;
  statusMessage: string;
  transactionId: string;
  data: OutboundSubscriptionDeleteData;
}

export interface MtnApiError {
  statusCode: string;
  statusMessage: string;
  transactionId: string;
  supportMessage?: string;
  timestamp?: string;
  path?: string;
  method?: string;
}

export interface MtnApiForbiddenError extends MtnApiError {
  supportMessage?: string;
  timestamp: string;
  path: string;
  method: string;
}
