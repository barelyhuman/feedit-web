import { fromNodeHeaders } from "better-auth/node";
import { auth } from "../../../../lib/auth";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const PAGE_SIZE = 50;

/**
 * GET /api/feeds/:id/items?cursor=<lastItemId>
 *
 * @param {import("adex/http").IncomingMessage} req
 * @param {import("adex/http").ServerResponse} res
 */
export default async function (req, res) {
  if (req.method !== "GET") {
    res.statusCode = 405;
    return res.json({ error: "Method not allowed" });
  }

  const session = await auth.api.getSession({
    headers: fromNodeHeaders(req.headers),
  });

  if (!session?.user?.id) {
    res.statusCode = 401;
    return res.json({ error: "Unauthorized" });
  }

  const userId = session.user.id;
  const { id } = req.params;
  const cursor = new URL(req.url, "http://localhost").searchParams.get(
    "cursor",
  );

  const items = await prisma.feedItem.findMany({
    where: { feedId: id, feed: { userId } },
    orderBy: { publishedAt: "desc" },
    take: PAGE_SIZE,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  const nextCursor =
    items.length === PAGE_SIZE ? (items.at(-1)?.id ?? null) : null;

  return res.json({ items, nextCursor });
}
