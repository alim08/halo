"use client";

import { ChatMessage } from "@/lib/api";

type MessageListProps = {
  messages: ChatMessage[];
  currentUserId: string;
};

/**
 * MessageList renders chat messages in chronological order (newest at bottom).
 * Messages from the current user are right-aligned, others left-aligned.
 */
export function MessageList({ messages, currentUserId }: MessageListProps) {
  if (messages.length === 0) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-sm text-gray-400">
          No messages yet. Say something!
        </p>
      </div>
    );
  }

  // Messages come newest-first from the API; reverse for display.
  const sorted = [...messages].reverse();

  return (
    <div className="flex flex-col gap-2">
      {sorted.map((msg) => {
        const isOwn = msg.sender_id === currentUserId;
        const isPending = msg.id.startsWith("pending-");

        return (
          <div
            key={msg.id}
            className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                isOwn
                  ? "bg-halo-primary text-white"
                  : "bg-gray-200 text-gray-900"
              } ${isPending ? "opacity-60" : ""}`}
            >
              <p className="text-sm">{msg.body}</p>
              <p
                className={`mt-1 text-right text-[10px] ${
                  isOwn ? "text-white/70" : "text-gray-400"
                }`}
              >
                {isPending
                  ? "Sending…"
                  : formatTime(msg.created_at)}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
