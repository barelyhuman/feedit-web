import { XMLParser } from "fast-xml-parser";

function extractHtml(block) {
  if (!block) return;
  if (typeof block === "string") {
    return block;
  }
  if (
    typeof block === "object" &&
    "@_type" in block &&
    block["@_type"] === "html"
  ) {
    return block["#text"] ?? "";
  }
}

function stripHtml(htmlBlock) {
  const html = extractHtml(htmlBlock);
  if (!html) return null;
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 500);
}

function parseItems(channel) {
  const rawItems = channel.item ?? [];
  const items = Array.isArray(rawItems) ? rawItems : [rawItems];
  return items.map((item) => ({
    title: item.title ?? "Untitled",
    url: item.link ?? "",
    description: stripHtml(item.description ?? item.summary ?? null),
    publishedAt: item.pubDate ? new Date(item.pubDate) : null,
  }));
}

function parseAtomItems(feed) {
  const rawEntries = feed.entry ?? [];
  const entries = Array.isArray(rawEntries) ? rawEntries : [rawEntries];
  return entries.map((entry) => {
    let url = "";
    if (entry.link) {
      if (typeof entry.link === "string") url = entry.link;
      else if (Array.isArray(entry.link)) {
        const alt = entry.link.find((l) => l["@_rel"] === "alternate");
        url = (alt ?? entry.link[0])?.["@_href"] ?? "";
      } else {
        url = entry.link["@_href"] ?? "";
      }
    }
    return {
      title: entry.title ?? "Untitled",
      url,
      description: stripHtml(entry.summary ?? entry.content ?? null),
      publishedAt: entry.published ? new Date(entry.published) : null,
    };
  });
}

/**
 * Fetch, parse, and upsert a feed for a given user.
 * Throws on any failure (network, parse, unsupported format).
 */
export async function fetchAndParseFeed(url, userId, prisma) {
  const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (!response.ok) {
    throw new Error(`Failed to fetch feed: ${response.status}`);
  }
  const xml = await response.text();

  const parser = new XMLParser({ ignoreAttributes: false });
  const parsed = parser.parse(xml);

  let feedData;
  let items;

  if (parsed.rss?.channel) {
    const channel = parsed.rss.channel;
    feedData = {
      title: channel.title ?? url,
      description: stripHtml(channel.description ?? null),
    };
    items = parseItems(channel);
  } else if (parsed.feed) {
    const feed = parsed.feed;
    feedData = {
      title:
        typeof feed.title === "string"
          ? feed.title
          : (feed.title?.["#text"] ?? url),
      description: stripHtml(feed.subtitle ?? null),
    };
    items = parseAtomItems(feed);
  } else {
    throw new Error("Unsupported feed format");
  }

  return prisma.feed.upsert({
    where: { url_userId: { url, userId } },
    create: {
      url,
      title: feedData.title,
      description: feedData.description,
      userId,
      items: { create: items },
    },
    update: { title: feedData.title },
    include: {
      items: { orderBy: { publishedAt: "desc" }, take: 50 },
    },
  });
}
