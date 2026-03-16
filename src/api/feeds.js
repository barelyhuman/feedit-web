import { fromNodeHeaders } from "better-auth/node";
import { auth } from "../../lib/auth";
import { PrismaClient } from "@prisma/client";
import { XMLParser } from "fast-xml-parser";

const prisma = new PrismaClient();

function extractHtml(block) {
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
 * @param {import("adex/http").IncomingMessage} req
 * @param {import("adex/http").ServerResponse} res
 */
export default async function (req, res) {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(req.headers),
  });

  if (!session?.user?.id) {
    res.statusCode = 401;
    return res.json({ error: "Unauthorized" });
  }

  const userId = session.user.id;

  if (req.method === "GET") {
    const feeds = await prisma.feed.findMany({
      where: { userId },
      include: {
        items: { orderBy: { publishedAt: "desc" }, take: 50 },
      },
      orderBy: { createdAt: "desc" },
    });
    return res.json(feeds);
  }

  if (req.method === "POST") {
    const { url } = await req.parseBodyJSON();

    if (!url) {
      res.statusCode = 400;
      return res.json({ error: "URL is required" });
    }

    let xml;
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(10000),
      });
      if (!response.ok) {
        res.statusCode = 400;
        return res.json({ error: `Failed to fetch feed: ${response.status}` });
      }
      xml = await response.text();
    } catch (e) {
      res.statusCode = 400;
      return res.json({ error: "Failed to fetch feed URL" });
    }

    const parser = new XMLParser({ ignoreAttributes: false });
    let parsed;
    try {
      parsed = parser.parse(xml);
    } catch (e) {
      res.statusCode = 400;
      return res.json({ error: "Failed to parse feed XML" });
    }

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
      res.statusCode = 400;
      return res.json({ error: "Unsupported feed format" });
    }

    const feed = await prisma.feed.upsert({
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

    res.statusCode = 201;
    return res.json(feed);
  }

  res.statusCode = 405;
  return res.json({ error: "Method not allowed" });
}
