import { fromNodeHeaders } from "better-auth/node";
import { auth } from "../../lib/auth";
import { PrismaClient } from "@prisma/client";
import { fetchAndParseFeed } from "../lib/feedParser";

const prisma = new PrismaClient();

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
      orderBy: { title: "asc" },
    });
    return res.json(feeds);
  }

  if (req.method === "POST") {
    const { url } = await req.parseBodyJSON();

    if (!url) {
      res.statusCode = 400;
      return res.json({ error: "URL is required" });
    }

    try {
      const feed = await fetchAndParseFeed(url, userId, prisma);
      res.statusCode = 201;
      return res.json(feed);
    } catch (e) {
      res.statusCode = 400;
      return res.json({ error: e.message ?? "Failed to add feed" });
    }
  }

  res.statusCode = 405;
  return res.json({ error: "Method not allowed" });
}
