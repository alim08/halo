"use client";

import { useCallback, useRef } from "react";
import { Send } from "lucide-react";

type MessageComposerProps = {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
};

export function MessageComposer({
  value,
  onChange,
  onSend,
}: MessageComposerProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (value.trim()) {
        onSend();
        inputRef.current?.focus();
      }
    },
    [value, onSend]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        if (value.trim()) {
          onSend();
        }
      }
    },
    [value, onSend]
  );

  return (
    <form
      onSubmit={handleSubmit}
      className="glass sticky bottom-0 px-4 py-3 lg:px-6"
    >
      <div className="mx-auto flex max-w-3xl items-center gap-3">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          className="flex-1 rounded-full bg-halo-surface-container px-5 py-2.5 text-sm text-halo-on-surface placeholder:text-halo-outline outline-none transition-colors focus:bg-halo-surface-container-high focus:ring-1 focus:ring-halo-primary/20"
          autoComplete="off"
        />
        <button
          type="submit"
          disabled={!value.trim()}
          aria-label="Send message"
          className="flex h-11 w-11 min-h-touch min-w-touch items-center justify-center rounded-full bg-gradient-to-r from-halo-primary to-halo-primary-container text-halo-on-primary shadow-ambient transition-all hover:shadow-ambient-lg disabled:opacity-40 active:scale-95"
        >
          <Send className="h-5 w-5" />
        </button>
      </div>
    </form>
  );
}
