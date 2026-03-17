import { signal, computed } from "@preact/signals";

export type FeedItem = {
  id: string;
  feedId: string;
  title: string;
  url: string;
  description: string | null;
  publishedAt: string | null;
  createdAt: string;
  isRead: boolean;
};

export type Feed = {
  id: string;
  url: string;
  title: string;
  description: string | null;
  userId: string;
  createdAt: string;
  items: FeedItem[];
};

export const feedsState = signal<Feed[]>([]);
export const selectedFeedId = signal<string | null>(null);
export const loadingFeeds = signal(true);
export const addingFeed = signal(false);
export const addFeedLoading = signal(false);
export const importingFeeds = signal(false);

export const selectedFeed = computed(
  () => feedsState.value.find((f) => f.id === selectedFeedId.value) ?? null,
);

// null = still loading
export const unreadCounts = signal<Record<string, number> | null>(null);

export async function loadUnreadCounts() {
  const res = await fetch("/api/feeds/unread-counts");
  if (res.ok) {
    unreadCounts.value = await res.json();
  }
}

export async function loadFeeds() {
  loadingFeeds.value = true;
  try {
    const res = await fetch("/api/feeds");
    if (res.ok) {
      feedsState.value = await res.json();
    }
  } finally {
    loadingFeeds.value = false;
  }
}

export async function addFeed(url: string): Promise<{ error?: string }> {
  addFeedLoading.value = true;
  try {
    const res = await fetch("/api/feeds", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });
    const data = await res.json();
    if (!res.ok) {
      return { error: data.error ?? "Failed to add feed" };
    }
    feedsState.value = [data, ...feedsState.value];
    selectedFeedId.value = data.id;
    return {};
  } catch (e) {
    return { error: "Network error" };
  } finally {
    addFeedLoading.value = false;
  }
}

export async function importFeeds(
  urls: string[],
): Promise<{ imported: number; failed: number }> {
  importingFeeds.value = true;
  try {
    const res = await fetch("/api/feeds/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ urls }),
    });
    const data = await res.json();
    await Promise.all([loadFeeds(), loadUnreadCounts()]);
    return data;
  } finally {
    importingFeeds.value = false;
  }
}

export async function markAsRead(
  feedId: string,
  itemId: string,
): Promise<{ error?: string }> {
  feedsState.value = feedsState.value.map((d) => {
    const { items, ...rest } = d;
    return {
      ...rest,
      items: items.map((x) => {
        const { isRead, ...rest } = x;
        return {
          ...rest,
          isRead: x.id === itemId ? true : isRead,
        };
      }),
    };
  });

  try {
    const res = await fetch(`/api/feeds/${feedId}/item/${itemId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isRead: true }),
    });
    const data = await res.json();
    if (!res.ok) {
      return { error: data.error ?? "Failed to add feed" };
    }
    loadUnreadCounts();
  } catch (err) {
    return { error: err };
  }
  return;
}
