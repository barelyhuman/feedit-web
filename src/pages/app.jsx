import { useEffect, useRef } from "preact/hooks";
import { sync, authState, useEnforceAuth } from "../store/auth";
import {
  feedsState,
  selectedFeedId,
  selectedFeed,
  unreadCountByFeed,
  loadingFeeds,
  addingFeed,
  addFeedLoading,
  loadFeeds,
  addFeed,
  markAsRead,
} from "../store/feeds";
import { authClient } from "../../lib/auth_client";

function formatDate(dateStr) {
  if (!dateStr) return null;
  try {
    return new Date(dateStr).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  } catch {
    return null;
  }
}

function FeedItemRow({ item }) {
  const date = formatDate(item.publishedAt);
  const handleClick = async () => {
    await markAsRead(selectedFeedId.value, item.id);
  };
  return (
    <div onClick={handleClick}>
      <a
        href={item.url}
        target="_blank"
        rel="noopener noreferrer"
        class="block py-4 group"
      >
        <div class="flex items-center gap-2">
          <div class="w-2 h-10">
            {!item.isRead ? (
              <div class="h-full w-1 self-start mt-1 rounded-full bg-black"></div>
            ) : null}
          </div>
          <div>
            <div class="flex items-baseline justify-between gap-4">
              <p class="text-sm font-medium leading-snug line-clamp-2 group-hover:underline">
                {item.title}
              </p>
              {date && (
                <span class="text-[11px] text-neutral-400 flex-shrink-0">
                  {date}
                </span>
              )}
            </div>
            {item.description && (
              <p class="text-xs text-neutral-400 mt-1 line-clamp-1">
                {item.description}
              </p>
            )}
          </div>
        </div>
      </a>
    </div>
  );
}

export default function App() {
  useEnforceAuth();
  const inputRef = useRef(null);

  useEffect(() => {
    loadFeeds();
  }, []);

  useEffect(() => {
    if (addingFeed.value && inputRef.current) {
      inputRef.current.focus();
    }
  }, [addingFeed.value]);

  async function handleAddFeed(e) {
    e.preventDefault();
    const url = inputRef.current?.value?.trim();
    if (!url) return;
    const { error } = await addFeed(url);
    if (!error) {
      inputRef.current.value = "";
      addingFeed.value = false;
    } else {
      alert(error);
    }
  }

  const feeds = feedsState.value;
  const feed = selectedFeed.value;

  return (
    <div class="bg-white text-[#0a0a0a] flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside class="w-56 border-r border-[#e5e5e5] flex flex-col bg-white flex-shrink-0">
        {/* Header */}
        <div class="px-5 pt-6 pb-4">
          <span class="text-sm font-semibold tracking-tight">feedit</span>
        </div>

        {/* Feeds list */}
        <div class="flex-1 overflow-y-auto">
          <div class="flex items-center justify-between px-5 pt-4 pb-1">
            <span class="text-[10px] tracking-widest font-medium text-neutral-400 uppercase">
              Feeds
            </span>
            <button
              onClick={() => {
                addingFeed.value = !addingFeed.value;
              }}
              class="text-neutral-400 hover:text-[#0a0a0a] leading-none"
              title="Add feed"
            >
              +
            </button>
          </div>

          {addingFeed.value && (
            <form onSubmit={handleAddFeed}>
              <input
                ref={inputRef}
                type="url"
                placeholder="https://example.com/feed.xml"
                class="w-full border-b border-[#e5e5e5] focus:border-[#0a0a0a] bg-transparent text-xs px-5 py-2 outline-none"
                disabled={addFeedLoading.value}
                onKeyDown={(e) => {
                  if (e.key === "Escape") addingFeed.value = false;
                }}
              />
            </form>
          )}

          {loadingFeeds.value ? (
            <p class="text-xs text-neutral-400 px-5 py-2">Loading…</p>
          ) : feeds.length === 0 ? (
            <p class="text-xs text-neutral-400 px-5 py-2">No feeds yet</p>
          ) : (
            <ul class="mt-1">
              {feeds.map((f) => {
                const unread = unreadCountByFeed.value[f.id] ?? 0;
                return (
                  <li key={f.id}>
                    <button
                      onClick={() => {
                        selectedFeedId.value = f.id;
                      }}
                      class={`w-full text-left px-5 py-2 text-sm flex items-center justify-between gap-2 hover:text-[#0a0a0a] ${
                        selectedFeedId.value === f.id
                          ? "text-[#0a0a0a] font-medium"
                          : "text-neutral-500"
                      }`}
                    >
                      <span class="truncate">{f.title}</span>
                      {unread > 0 && (
                        <span class="flex-shrink-0 text-[10px] font-medium text-neutral-400">
                          {unread}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* User footer */}
        <UserFooter />
      </aside>

      {/* Main */}
      <main class="flex-1 overflow-y-auto">
        {!feed ? (
          <EmptyState />
        ) : (
          <div class="max-w-2xl mx-auto px-8 py-10">
            <h1 class="text-base font-semibold mb-0.5">{feed.title}</h1>
            {feed.description && (
              <p class="text-xs text-neutral-400 mb-6">{feed.description}</p>
            )}
            <div class="border-t border-[#e5e5e5] mb-6" />
            {feed.items.length === 0 ? (
              <p class="text-sm text-neutral-400">No items found.</p>
            ) : (
              feed.items.map((item) => (
                <FeedItemRow key={item.id} item={item} />
              ))
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function EmptyState() {
  return (
    <div class="h-full flex items-center justify-center">
      <p class="text-sm text-neutral-400">Select a feed to start reading.</p>
    </div>
  );
}

function UserFooter() {
  if (!authState.value.loggedIn) return null;
  return (
    <div class="border-t border-[#e5e5e5] px-5 py-4">
      <p class="text-xs font-medium truncate">{authState.value.user.name}</p>

      <p class="text-[11px] text-neutral-400 truncate">
        {authState.value.user.email}
      </p>

      <button
        onClick={async () => {
          await authClient.signOut();
          await sync();
          setTimeout(() => {
            window.location.href = "/app";
          }, 100);
        }}
        class="mt-3 w-full text-left text-xs text-neutral-400 hover:text-[#0a0a0a] border border-[#e5e5e5] hover:border-[#0a0a0a] rounded px-3 py-1.5 transition-colors"
      >
        Log out
      </button>
    </div>
  );
}
