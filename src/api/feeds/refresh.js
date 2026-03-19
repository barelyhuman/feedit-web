import { fromNodeHeaders } from "better-auth/node";
import { auth } from "../../../lib/auth";
import { PrismaClient } from "@prisma/client";
import { refreshFeed } from "../../lib/feedParser";

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

  if (req.method !== "POST") {
    res.statusCode = 405;
    return res.json({ error: "Method not allowed" });
  }

  const userId = session.user.id;

  const feeds = await prisma.feed.findMany({
    where: { userId },
    select: { id: true, url: true },
  });

  await Promise.allSettled(
    feeds.map((feed) => refreshFeed(feed.id, feed.url, prisma)),
  );

  return res.json({ ok: true });
}
