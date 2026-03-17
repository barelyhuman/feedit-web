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

type FeedPagination = {
  nextCursor: string | null;
  hasMore: boolean;
  loadingMore: boolean;
};

export const feedsState = signal<Feed[]>([]);
export const selectedFeedId = signal<string | null>(null);
export const loadingFeeds = signal(true);
export const addingFeed = signal(false);
export const addFeedLoading = signal(false);
export const importingFeeds = signal(false);
export const feedPagination = signal<Record<string, FeedPagination>>({});

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
      const feeds: Feed[] = await res.json();
      feedsState.value = feeds;
      const pagination: Record<string, FeedPagination> = {};
      for (const f of feeds) {
        const hasMore = f.items.length >= 50;
        pagination[f.id] = {
          nextCursor: hasMore ? (f.items.at(-1)?.id ?? null) : null,
          hasMore,
          loadingMore: false,
        };
      }
      feedPagination.value = pagination;
    }
  } finally {
    loadingFeeds.value = false;
  }
}

export async function loadMoreItems(feedId: string) {
  const p = feedPagination.value[feedId];
  if (!p?.hasMore || p.loadingMore) return;

  feedPagination.value = {
    ...feedPagination.value,
    [feedId]: { ...p, loadingMore: true },
  };

  try {
    const res = await fetch(
      `/api/feeds/${feedId}/items?cursor=${p.nextCursor}`,
    );
    if (!res.ok) return;
    const { items, nextCursor }: { items: FeedItem[]; nextCursor: string | null } =
      await res.json();

    feedsState.value = feedsState.value.map((f) =>
      f.id === feedId ? { ...f, items: [...f.items, ...items] } : f,
    );

    feedPagination.value = {
      ...feedPagination.value,
      [feedId]: {
        nextCursor,
        hasMore: nextCursor !== null,
        loadingMore: false,
      },
    };
  } catch {
    feedPagination.value = {
      ...feedPagination.value,
      [feedId]: { ...feedPagination.value[feedId], loadingMore: false },
    };
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

export async function markAllRead(feedId: string): Promise<{ error?: string }> {
  feedsState.value = feedsState.value.map((f) =>
    f.id === feedId
      ? { ...f, items: f.items.map((item) => ({ ...item, isRead: true })) }
      : f,
  );

  try {
    const res = await fetch(`/api/feeds/${feedId}/mark-all-read`, {
      method: "POST",
    });
    if (!res.ok) {
      const data = await res.json();
      return { error: data.error ?? "Failed to mark all read" };
    }
    loadUnreadCounts();
  } catch (err) {
    return { error: "Network error" };
  }
  return {};
}

export async function deleteFeed(feedId: string): Promise<{ error?: string }> {
  try {
    const res = await fetch(`/api/feeds/${feedId}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      return { error: data.error ?? "Failed to delete feed" };
    }
    feedsState.value = feedsState.value.filter((f) => f.id !== feedId);
    const { [feedId]: _, ...rest } = feedPagination.value;
    feedPagination.value = rest;
  } catch (err) {
    return { error: "Network error" };
  }
  return {};
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
