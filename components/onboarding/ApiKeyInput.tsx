"use client";

import { Input } from "@/components/ui/Input";
import { PROVIDER_KEY_URL, PROVIDER_LABEL } from "@/lib/provider-options";
import type { Provider } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useState } from "react";

type Props = {
  provider: Provider;
  apiKey: string;
  onApiKeyChange: (key: string) => void;
  /** Shown below the fields (e.g. after a failed connect). Cleared via `onUserEdit`. */
  errorMessage?: string | null;
  onUserEdit?: () => void;
};

export function ApiKeyInput({
  provider,
  apiKey,
  onApiKeyChange,
  errorMessage,
  onUserEdit,
}: Props) {
  const [visible, setVisible] = useState(false);

  const bumpEdit = () => {
    onUserEdit?.();
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <div className="flex justify-between gap-2 text-xs text-muted">
          <label htmlFor="api-key-input">Secret key</label>
          <a
            href={PROVIDER_KEY_URL[provider]}
            target="_blank"
            rel="noreferrer"
            className="text-accent underline-offset-4 hover:underline"
          >
            Get a key from {PROVIDER_LABEL[provider]} →
          </a>
        </div>
        <div className="relative">
          <Input
            id="api-key-input"
            type={visible ? "text" : "password"}
            value={apiKey}
            placeholder="Paste your key here"
            autoComplete="off"
            className={cn("bg-surface pr-12")}
            onChange={(e) => {
              bumpEdit();
              onApiKeyChange(e.target.value);
            }}
          />
          <button
            type="button"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1.5 text-xs font-medium text-muted hover:bg-accent-soft hover:text-accent"
            onClick={() => setVisible((v) => !v)}
          >
            {visible ? "Hide" : "Show"}
          </button>
        </div>
      </div>
      {errorMessage ? (
        <p className="text-center text-sm text-red-600 dark:text-red-400" role="alert">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}
