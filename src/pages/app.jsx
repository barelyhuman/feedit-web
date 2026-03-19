import { useEffect, useRef, useState } from "preact/hooks";
import { sync, authState, useEnforceAuth } from "../store/auth";
import {
  feedsState,
  selectedFeedId,
  selectedFeed,
  unreadCounts,
  loadingFeeds,
  addingFeed,
  addFeedLoading,
  importingFeeds,
  feedPagination,
  loadFeeds,
  loadUnreadCounts,
  refreshFeeds,
  loadMoreItems,
  addFeed,
  importFeeds,
  markAsRead,
  markAllRead,
  deleteFeed,
} from "../store/feeds";
import { authClient } from "../../lib/auth_client";
import { toast } from "../lib/toast";

function parseOpml(text) {
  const doc = new DOMParser().parseFromString(text, "text/xml");
  return [...doc.querySelectorAll("outline[xmlUrl]")]
    .map((el) => el.getAttribute("xmlUrl"))
    .filter(Boolean);
}

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
  const opmlInputRef = useRef(null);
  const sentinelRef = useRef(null);
  const [showMenu, setShowMenu] = useState(false);

  useEffect(() => {
    loadFeeds();
    loadUnreadCounts();
    refreshFeeds();
  }, []);

  useEffect(() => {
    if (addingFeed.value && inputRef.current) {
      inputRef.current.focus();
    }
  }, [addingFeed.value]);

  useEffect(() => {
    if (!sentinelRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          loadMoreItems(selectedFeedId.value);
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [selectedFeedId.value]);

  useEffect(() => {
    if (!showMenu) return;
    function handleOutsideClick(e) {
      if (!e.target.closest("[data-menu]")) {
        setShowMenu(false);
      }
    }
    document.addEventListener("click", handleOutsideClick);
    return () => document.removeEventListener("click", handleOutsideClick);
  }, [showMenu]);

  async function handleMarkAllRead() {
    const feed = selectedFeed.value;
    if (!feed) return;
    const { error } = await markAllRead(feed.id);
    if (error) {
      toast(error, "error");
    } else {
      toast("Marked all as read");
    }
  }

  async function handleDeleteFeed() {
    const feed = selectedFeed.value;
    if (!feed) return;
    if (!confirm(`Delete "${feed.title}"?`)) return;
    const { error } = await deleteFeed(feed.id);
    if (error) {
      toast(error, "error");
    } else {
      selectedFeedId.value = null;
      toast("Feed deleted");
    }
  }

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

  async function handleOpmlFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const urls = parseOpml(text);
    e.target.value = "";
    if (urls.length === 0) {
      toast("No feeds found in OPML file");
      return;
    }
    const { imported, failed } = await importFeeds(urls);
    toast(
      failed > 0
        ? `Imported ${imported}, ${failed} failed`
        : `Imported ${imported} feed${imported === 1 ? "" : "s"}`,
    );
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
            <div class="flex items-center gap-2 relative" data-menu>
              <button
                onClick={() => {
                  addingFeed.value = !addingFeed.value;
                }}
                class="text-neutral-400 hover:text-[#0a0a0a] leading-none"
                title="Add feed"
              >
                +
              </button>
              <button
                onClick={() => setShowMenu((v) => !v)}
                class="text-neutral-400 hover:text-[#0a0a0a] leading-none text-base"
                title="More options"
              >
                ⋯
              </button>
              {showMenu && (
                <div class="absolute right-0 top-5 bg-white border border-[#e5e5e5] rounded-md shadow-sm z-10 min-w-[120px]">
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      opmlInputRef.current?.click();
                    }}
                    class="w-full text-left px-3 py-2 text-xs hover:bg-neutral-50"
                  >
                    Import OPML
                  </button>
                </div>
              )}
            </div>
          </div>

          <input
            ref={opmlInputRef}
            type="file"
            accept=".opml,.xml"
            class="hidden"
            onChange={handleOpmlFile}
          />

          {importingFeeds.value && (
            <p class="text-xs text-neutral-400 px-5 py-2">Importing feeds…</p>
          )}

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
                const counts = unreadCounts.value;
                const unread = counts !== null ? (counts[f.id] ?? 0) : null;
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
                      {unread === null ? (
                        <span class="flex-shrink-0 w-5 h-2.5 rounded bg-neutral-200 animate-pulse" />
                      ) : unread > 0 ? (
                        <span class="flex-shrink-0 text-[10px] font-medium text-neutral-400">
                          {unread}
                        </span>
                      ) : null}
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
              <p class="text-xs text-neutral-400 mb-1">{feed.description}</p>
            )}
            <div class="w-full justify-end flex items-center gap-3 py-3">
              <button
                onClick={handleMarkAllRead}
                class="border rounded-sm p-2 text-xs text-neutral-400 hover:text-[#0a0a0a] hover:border-[#0a0a0a]"
              >
                Mark all read
              </button>
              <button
                onClick={handleDeleteFeed}
                class="border rounded-sm p-2 text-xs text-neutral-400 hover:text-red-500 hover:border-red-500"
              >
                Delete feed
              </button>
            </div>
            <div class="border-t border-[#e5e5e5] mb-6" />
            {feed.items.length === 0 ? (
              <p class="text-sm text-neutral-400">No items found.</p>
            ) : (
              <>
                {feed.items.map((item) => (
                  <FeedItemRow key={item.id} item={item} />
                ))}
                <div ref={sentinelRef} />
                {feedPagination.value[feed.id]?.loadingMore && (
                  <p class="text-xs text-neutral-400 py-4 text-center">
                    Loading…
                  </p>
                )}
              </>
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
