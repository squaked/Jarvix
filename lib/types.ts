import type { Provider } from "./provider-options";

export type { Provider };

/** Stored credentials for one LLM vendor */
export type ProviderProfile = {
  apiKey: string;
  model: string;
};

/** Unified personality: conversation style + tone in one choice */
export type AgentPersonalityPreset =
  | "balanced"
  | "warm"
  | "professional"
  | "custom";

/** Saved onboarding / Settings — shapes how Jarvix speaks (not replacing safety rules). */
export type AgentPersonalization = {
  /** Optional name or nickname Jarvix may use when addressing the user */
  displayName: string;
  personalityPreset: AgentPersonalityPreset;
  /** Only when personalityPreset is custom — character/personality guidance only */
  personalityCustom: string;
};

/** Groq Orpheus English TTS voice IDs (canopylabs/orpheus-v1-english). */
export type TtsVoiceId = "troy" | "austin" | "autumn" | "hannah";

/** Read-aloud settings (Groq [text-to-speech / Orpheus](https://console.groq.com/docs/text-to-speech/orpheus)). */
export type TtsSettings = {
  /** Master switch: when off, nothing is spoken until the user turns it on. */
  enabled: boolean;
  /** After each assistant reply finishes, read it aloud automatically. */
  autoReadReplies: boolean;
  voice: TtsVoiceId;
};

export type McpConnector = {
  id: string;
  name: string;
  enabled: boolean;
  type: "stdio" | "sse";
  /** For stdio: command to run (e.g. npx) */
  command?: string;
  /** For stdio: args (e.g. ["-y", "@modelcontextprotocol/server-everything"]) */
  args?: string[];
  /** For sse: the endpoint URL */
  url?: string;
  /** Environment variables for the connector */
  env?: Record<string, string>;
  /** Optional metadata for library items */
  icon?: string;
  description?: string;
};

export type InternalConnectorId =
  | "web_search"
  | "fetch_web_page"
  | "weather"
  | "calendar"
  | "files"
  | "screenshot";

export type InternalConnector = {
  id: InternalConnectorId;
  enabled: boolean;
};

export type Settings = {
  provider: Provider;
  memoryEnabled: boolean;
  /** Per-provider API key (chat model is fixed in app). */
  profiles: Record<Provider, ProviderProfile>;
  agent: AgentPersonalization;
  /** City or place name for the dashboard weather widget (geocoded via Open-Meteo). */
  weatherLocation: string;
  tts: TtsSettings;
  /** Built-in Jarvix tools (toggleable) */
  internalConnectors: InternalConnector[];
  /** MCP connectors (integrations) */
  connectors: McpConnector[];
};

export type Message = {
  id: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  /** For tool role: which tool was called */
  toolName?: string;
  toolCallId?: string;
};

export type Chat = {
  id: string;
  title: string;
  messages: Message[];
  createdAt: string;
  updatedAt: string;
};

export type MemoryEntry = {
  id: string;
  fact: string;
  createdAt: string;
};
