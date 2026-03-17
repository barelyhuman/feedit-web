import { fromNodeHeaders } from "better-auth/node";
import { auth } from "../../../lib/auth";
import { PrismaClient } from "@prisma/client";
import { fetchAndParseFeed } from "../../lib/feedParser";

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
  const { urls } = await req.parseBodyJSON();

  if (!Array.isArray(urls) || urls.length === 0) {
    res.statusCode = 400;
    return res.json({ error: "urls must be a non-empty array" });
  }

  let imported = 0;
  let failed = 0;

  for (const url of urls) {
    try {
      await fetchAndParseFeed(url, userId, prisma);
      imported++;
    } catch {
      failed++;
    }
  }

  return res.json({ imported, failed });
}
