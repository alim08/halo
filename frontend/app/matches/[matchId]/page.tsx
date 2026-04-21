"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { isAuthenticated, api, MeResponse } from "@/lib/api";
import { MessageList } from "@/components/chat/MessageList";
import { MessageComposer } from "@/components/chat/MessageComposer";
import { SparksBar } from "@/components/chat/SparksBar";
import { useChat } from "@/components/chat/useChat";
import { useMatchProfile } from "@/components/chat/useMatchProfile";
import { SecureImage } from "@/components/media/SecureImage";
import { ConnectionLevelBar } from "@/components/match/ConnectionLevelBar";
import { ArrowLeft } from "lucide-react";

export default function ChatPage() {
  const router = useRouter();
  const params = useParams();
  const matchId = params.matchId as string;
  const [me, setMe] = useState<MeResponse | null>(null);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace("/login");
      return;
    }
    api.me.get().then(setMe).catch(() => router.replace("/login"));
  }, [router]);

  const {
    messages,
    loading,
    error,
    sendMessage,
    sparks,
    composerText,
    setComposerText,
    loadMore,
    hasMore,
  } = useChat(matchId, me?.id ?? "");

  const { profile, refreshProfile } = useMatchProfile(matchId, me?.id ?? "");

  async function handleSendMessage() {
    const sent = await sendMessage();
    if (!sent) return;

    refreshProfile();

    // The level update happens server-side during send, so a short follow-up
    // refresh keeps the header/progress bar in sync even if WS delivery lags.
    window.setTimeout(() => {
      refreshProfile();
    }, 600);
  }

  if (!me) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-halo-primary border-t-transparent" />
      </div>
    );
  }

  const partnerName = profile?.partner.display_name ?? "Chat";

  return (
    <main className="flex min-h-screen flex-col bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b bg-white px-4 py-3">
        <button
          onClick={() => router.push("/matches")}
          className="min-h-touch min-w-touch p-1"
          aria-label="Back to matches"
        >
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </button>

        {/* Partner photo (Secure Reveal variant) */}
        <SecureImage
          photo={profile?.photo ?? null}
          alt={partnerName}
          fallbackInitial={partnerName.charAt(0).toUpperCase()}
          className="h-9 w-9 rounded-full"
        />

        <div className="flex-1">
          <h1 className="text-base font-semibold text-gray-900">
            {partnerName}
          </h1>
          {profile && (
            <p className="text-xs text-gray-500">
              Level {profile.current_connection_level}
            </p>
          )}
        </div>
      </header>

      {/* Connection level bar */}
      {profile?.progress && (
        <div className="px-4 pt-2">
          <ConnectionLevelBar
            currentLevel={profile.current_connection_level}
            progress={profile.progress}
          />
        </div>
      )}

      {/* Sparks bar (shown when few messages) */}
      {sparks.length > 0 && messages.length < 5 && (
        <SparksBar sparks={sparks} onSelect={setComposerText} />
      )}

      {/* Messages */}
      <div className="flex flex-1 flex-col-reverse overflow-y-auto px-4 py-2">
        {loading && messages.length === 0 ? (
          <div className="flex items-center justify-center py-10">
            <div className="h-6 w-6 animate-spin rounded-full border-4 border-halo-primary border-t-transparent" />
          </div>
        ) : error ? (
          <p className="py-10 text-center text-red-600">{error}</p>
        ) : (
          <>
            {hasMore && (
              <button
                onClick={loadMore}
                className="mx-auto my-2 text-xs text-halo-primary"
              >
                Load earlier messages
              </button>
            )}
            <MessageList messages={messages} currentUserId={me.id} />
          </>
        )}
      </div>

      {/* Composer */}
      <MessageComposer
        value={composerText}
        onChange={setComposerText}
        onSend={handleSendMessage}
      />
    </main>
  );
}
