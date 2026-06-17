import type {
  CreateInstanceRequest,
  CreateInstanceResponse,
  ConnectInstanceResponse,
  ConnectionStateResponse,
  SendTextRequest,
  SendTextResponse,
  FetchInstancesResponse,
  InstanceSettings,
  EvolutionApiConfig,
} from "./types";

function buildConfig(): EvolutionApiConfig {
  return {
    baseUrl: import.meta.env.VITE_EVOLUTION_API_URL || "",
    apiKey: import.meta.env.VITE_EVOLUTION_API_KEY || "",
    instanceName: import.meta.env.VITE_EVOLUTION_INSTANCE || "",
  };
}

class EvolutionApiClient {
  private config: EvolutionApiConfig;

  constructor(config?: Partial<EvolutionApiConfig>) {
    this.config = { ...buildConfig(), ...config };
  }

  private get headers(): Record<string, string> {
    return {
      "Content-Type": "application/json",
      apikey: this.config.apiKey,
    };
  }

  private get baseUrl(): string {
    return this.config.baseUrl.replace(/\/+$/, "");
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const res = await fetch(url, {
      method,
      headers: this.headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Evolution API error ${res.status}: ${err}`);
    }
    return res.json();
  }

  createInstance(data: CreateInstanceRequest): Promise<CreateInstanceResponse> {
    return this.request<CreateInstanceResponse>("POST", "/instance/create", data);
  }

  connectInstance(instanceName?: string): Promise<ConnectInstanceResponse> {
    return this.request<ConnectInstanceResponse>("GET", `/instance/connect/${instanceName || this.config.instanceName}`);
  }

  connectionState(instanceName?: string): Promise<ConnectionStateResponse> {
    return this.request<ConnectionStateResponse>("GET", `/instance/connectionState/${instanceName || this.config.instanceName}`);
  }

  logoutInstance(instanceName?: string): Promise<void> {
    return this.request<void>("DELETE", `/instance/logout/${instanceName || this.config.instanceName}`);
  }

  deleteInstance(instanceName?: string): Promise<void> {
    return this.request<void>("DELETE", `/instance/delete/${instanceName || this.config.instanceName}`);
  }

  fetchInstances(): Promise<FetchInstancesResponse> {
    return this.request<FetchInstancesResponse>("GET", "/instance/fetchInstances");
  }

  sendText(data: SendTextRequest, instanceName?: string): Promise<SendTextResponse> {
    return this.request<SendTextResponse>("POST", `/message/sendText/${instanceName || this.config.instanceName}`, data);
  }

  restartInstance(instanceName?: string): Promise<void> {
    return this.request<void>("POST", `/instance/restart/${instanceName || this.config.instanceName}`);
  }

  setPresence(presence: "available" | "unavailable" | "composing" | "recording" | "paused", instanceName?: string): Promise<void> {
    return this.request<void>("POST", `/instance/setPresence/${instanceName || this.config.instanceName}`, { presence });
  }
}

export function createEvolutionClient(config?: Partial<EvolutionApiConfig>): EvolutionApiClient {
  return new EvolutionApiClient(config);
}

export { EvolutionApiClient };
