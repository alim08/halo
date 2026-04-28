"use client";

import { ChatMessage } from "@/lib/api";

type MessageListProps = {
  messages: ChatMessage[];
  currentUserId: string;
};

export function MessageList({ messages, currentUserId }: MessageListProps) {
  if (messages.length === 0) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="font-serif italic text-halo-on-surface-variant">
          No messages yet. Say something!
        </p>
      </div>
    );
  }

  const sorted = [...messages].reverse();

  return (
    <div className="flex flex-col gap-2.5">
      {sorted.map((msg) => {
        const isOwn = msg.sender_id === currentUserId;
        const isPending = msg.id.startsWith("pending-");

        return (
          <div
            key={msg.id}
            className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[75%] rounded-3xl px-4 py-2.5 ${
                isOwn
                  ? "bg-gradient-to-r from-halo-primary to-halo-primary-container text-halo-on-primary"
                  : "bg-halo-surface-container text-halo-on-surface"
              } ${isPending ? "opacity-60" : ""}`}
            >
              <p className="text-sm leading-relaxed">{msg.body}</p>
              <p
                className={`mt-1 text-right text-[10px] ${
                  isOwn ? "text-white/60" : "text-halo-outline"
                }`}
              >
                {isPending ? "Sending..." : formatTime(msg.created_at)}
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
