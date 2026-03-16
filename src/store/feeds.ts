import { signal, computed } from "@preact/signals";

export type FeedItem = {
  id: string;
  feedId: string;
  title: string;
  url: string;
  description: string | null;
  publishedAt: string | null;
  createdAt: string;
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

export const selectedFeed = computed(() =>
  feedsState.value.find((f) => f.id === selectedFeedId.value) ?? null
);

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
