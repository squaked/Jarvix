import type { Provider } from "./provider-options";

export type { Provider };

/** Stored credentials for one LLM vendor */
export type ProviderProfile = {
  apiKey: string;
  model: string;
};

/** Unified voice: conversation style + personality in one choice */
export type AgentVoicePreset =
  | "balanced"
  | "warm"
  | "professional"
  | "concise"
  | "custom";

/** Saved onboarding / Settings — shapes how Jarvix speaks (not replacing safety rules). */
export type AgentPersonalization = {
  /** Optional name or nickname Jarvix may use when addressing the user */
  displayName: string;
  voicePreset: AgentVoicePreset;
  /** Only when voicePreset is custom — character/voice guidance only */
  voiceCustom: string;
};

/** Groq Orpheus English TTS voice IDs (canopylabs/orpheus-v1-english). */
export type TtsVoiceId =
  | "autumn"
  | "diana"
  | "hannah"
  | "austin"
  | "daniel"
  | "troy";

/** Read-aloud settings (Groq [text-to-speech / Orpheus](https://console.groq.com/docs/text-to-speech/orpheus)). */
export type TtsSettings = {
  /** Master switch: when off, nothing is spoken until the user turns it on. */
  enabled: boolean;
  /** After each assistant reply finishes, read it aloud automatically. */
  autoReadReplies: boolean;
  voice: TtsVoiceId;
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
