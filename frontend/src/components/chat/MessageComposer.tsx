"use client";

import { useCallback, useRef } from "react";
import { Send } from "lucide-react";

type MessageComposerProps = {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
};

/**
 * MessageComposer provides the chat input with a send button.
 * 44px touch targets per constitution.
 */
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
      className="sticky bottom-0 flex items-center gap-2 border-t bg-white px-4 py-3"
    >
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Type a message…"
        className="flex-1 rounded-full border border-gray-300 px-4 py-2 text-sm outline-none focus:border-halo-primary"
        autoComplete="off"
      />
      <button
        type="submit"
        disabled={!value.trim()}
        aria-label="Send message"
        className="flex h-11 w-11 min-h-touch min-w-touch items-center justify-center rounded-full bg-halo-primary text-white transition-opacity disabled:opacity-40"
      >
        <Send className="h-5 w-5" />
      </button>
    </form>
  );
}
