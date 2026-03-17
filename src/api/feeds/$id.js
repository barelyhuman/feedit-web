import { fromNodeHeaders } from "better-auth/node";
import { auth } from "../../../lib/auth";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * @param {import("adex/http").IncomingMessage} req
 * @param {import("adex/http").ServerResponse} res
 */
export default async function (req, res) {
  if (req.method.toLowerCase() !== "delete") {
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
  const { id } = req.params;

  if (!id) {
    res.statusCode = 400;
    return res.json({ error: "Invalid params" });
  }

  try {
    await prisma.feed.delete({
      where: { id, userId },
    });

    return res.json({ success: true });
  } catch (err) {
    res.statusCode = 500;
    return res.json({ error: "Oops! Something went wrong..." });
  }
}
