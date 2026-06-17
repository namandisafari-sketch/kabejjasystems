export interface EvolutionApiConfig {
  baseUrl: string;
  apiKey: string;
  instanceName: string;
}

export interface CreateInstanceRequest {
  instanceName: string;
  integration?: "WHATSAPP-BAILEYS" | "WHATSAPP-CLOUD-API";
  qrcode?: boolean;
  number?: string;
  rejectCall?: boolean;
  msgCall?: string;
  groupsIgnore?: boolean;
  alwaysOnline?: boolean;
  readMessages?: boolean;
  readStatus?: boolean;
  syncFullHistory?: boolean;
  webhookUrl?: string;
  webhookByEvents?: boolean;
  webhookBase64?: boolean;
  webhookEvents?: string[];
}

export interface CreateInstanceResponse {
  instance: {
    instanceName: string;
    instanceId: string;
    status: string;
    serverUrl: string;
    apikey: string;
  };
  hash: {
    apikey: string;
  };
  settings: Record<string, unknown>;
}

export interface ConnectInstanceResponse {
  pairingCode: string | null;
  code: string;
  base64: string;
  count: number;
}

export interface ConnectionStateResponse {
  state: string;
  statusReason: string | number;
}

export interface SendTextRequest {
  number: string;
  text: string;
  linkPreview?: boolean;
  delay?: number;
  mentioned?: string[];
}

export interface SendTextResponse {
  key: {
    id: string;
    remoteJid: string;
    fromMe: boolean;
  };
  message: {
    conversation: string;
  };
}

export interface FetchInstancesResponse {
  [instanceName: string]: {
    instanceName: string;
    status: string;
    integration: string;
    serverUrl: string;
    apikey: string;
    ownerJid: string;
    profileName: string;
    profilePictureUrl: string;
  };
}

export interface InstanceSettings {
  rejectCall: boolean;
  msgCall: string;
  groupsIgnore: boolean;
  alwaysOnline: boolean;
  readMessages: boolean;
  readStatus: boolean;
  syncFullHistory: boolean;
  webhookUrl: string;
  webhookByEvents: boolean;
  webhookBase64: boolean;
  webhookEvents: string[];
}

export interface EvolutionApiError {
  success: boolean;
  error: {
    code: string;
    message: string;
    details?: string;
  };
  meta?: {
    timestamp: string;
    path: string;
    method: string;
  };
}
