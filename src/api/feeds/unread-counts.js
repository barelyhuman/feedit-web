import { fromNodeHeaders } from "better-auth/node";
import { auth } from "../../../lib/auth";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * GET /api/feeds/unread-counts
 * Returns { [feedId]: number } for all feeds belonging to the user.
 *
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

  if (req.method !== "GET") {
    res.statusCode = 405;
    return res.json({ error: "Method not allowed" });
  }

  const userId = session.user.id;

  const rows = await prisma.feedItem.groupBy({
    by: ["feedId"],
    where: { feed: { userId }, isRead: false },
    _count: { id: true },
  });

  const counts = Object.fromEntries(rows.map((r) => [r.feedId, r._count.id]));
  return res.json(counts);
}
