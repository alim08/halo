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

  const { profile } = useMatchProfile(matchId, me?.id ?? "");

  if (!me) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-halo-surface">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-halo-primary border-t-transparent" />
      </div>
    );
  }

  const partnerName = profile?.partner.display_name ?? "Chat";

  return (
    <main className="flex min-h-screen flex-col bg-halo-surface">
      {/* Header */}
      <header className="glass sticky top-0 z-10 px-4 py-3 lg:px-6">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <button
            onClick={() => router.push("/matches")}
            className="min-h-touch min-w-touch flex items-center justify-center rounded-full p-2 transition-colors hover:bg-halo-surface-container"
            aria-label="Back to matches"
          >
            <ArrowLeft className="h-5 w-5 text-halo-on-surface-variant" />
          </button>

          <SecureImage
            photo={profile?.photo ?? null}
            alt={partnerName}
            fallbackInitial={partnerName.charAt(0).toUpperCase()}
            className="h-10 w-10 rounded-full"
          />

          <div className="flex-1">
            <h1 className="font-serif text-base font-semibold text-halo-on-surface">
              {partnerName}
            </h1>
            {profile && (
              <p className="text-xs text-halo-on-surface-variant">
                Level {profile.current_connection_level}
              </p>
            )}
          </div>
        </div>
      </header>

      {/* Connection level bar */}
      {profile?.progress && (
        <div className="mx-auto w-full max-w-3xl px-4 pt-3 lg:px-6">
          <ConnectionLevelBar
            currentLevel={profile.current_connection_level}
            progress={profile.progress}
          />
        </div>
      )}

      {/* Sparks bar */}
      {sparks.length > 0 && messages.length < 5 && (
        <SparksBar sparks={sparks} onSelect={setComposerText} />
      )}

      {/* Messages */}
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col-reverse overflow-y-auto px-4 py-3 lg:px-6">
        {loading && messages.length === 0 ? (
          <div className="flex items-center justify-center py-10">
            <div className="h-6 w-6 animate-spin rounded-full border-4 border-halo-primary border-t-transparent" />
          </div>
        ) : error ? (
          <p className="py-10 text-center text-halo-error">{error}</p>
        ) : (
          <>
            {hasMore && (
              <button
                onClick={loadMore}
                className="mx-auto my-2 text-sm font-medium text-halo-primary hover:underline"
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
        onSend={sendMessage}
      />
    </main>
  );
}
