import { fromNodeHeaders } from "better-auth/node";
import { auth } from "../../../../../lib/auth";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * @param {import("adex/http").IncomingMessage} req
 * @param {import("adex/http").ServerResponse} res
 */
export default async function (req, res) {
  if (req.method.toLowerCase() !== "post") {
    res.statusCode = 404;
    return res.json({ error: "Not Found" });
  }

  const session = await auth.api.getSession({
    headers: fromNodeHeaders(req.headers),
  });

  if (!session?.user?.id) {
    res.statusCode = 401;
    return res.json({ error: "Unauthorized" });
  }

  const userId = session.user.id;

  try {
    const { isRead } = await req.parseBodyJSON();
    const { id, itemId } = req.params;

    if (!id || !itemId) {
      res.statusCode = 400;
      return res.json({
        error: "Invalid params",
      });
    }

    await prisma.feedItem.update({
      where: {
        id: itemId,
        feedId: id,
      },
      data: {
        isRead: isRead,
      },
    });

    res.statusCode = 201;
    return res.json({
      success: true,
    });
  } catch (err) {
    res.statusCode = 500;
    return res.json({
      error: "Oops! Something went wrong...",
    });
  }
}
