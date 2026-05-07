import type { ModelMessage } from "ai";
import type { Message } from "./types";

const DATA_URL_RE =
  /\n\n!\[attachment\]\((data:image\/[a-zA-Z0-9.+-]+;base64,[^\)]+)\)\s*$/;

export function splitAttachment(content: string): {
  text: string;
  imageDataUrl?: string;
} {
  const m = content.match(DATA_URL_RE);
  if (m?.index != null && m[1]) {
    return {
      text: content.slice(0, m.index).trim(),
      imageDataUrl: m[1],
    };
  }
  return { text: content };
}

export function jarvixMessagesToModel(messages: Message[]): ModelMessage[] {
  const out: ModelMessage[] = [];
  for (const m of messages) {
    if (m.role === "user") {
      const { text, imageDataUrl } = splitAttachment(m.content);
      const userText = text || (imageDataUrl ? "What's in this image?" : "");
      if (imageDataUrl) {
        out.push({
          role: "user",
          content: [
            { type: "text", text: userText },
            { type: "image", image: imageDataUrl },
          ],
        });
      } else {
        out.push({ role: "user", content: userText });
      }
    } else if (m.role === "assistant") {
      out.push({ role: "assistant", content: m.content });
    }
  }
  return out;
}
