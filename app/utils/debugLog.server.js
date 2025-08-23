import db from "../db.server";

export async function logDebug({shopId, type, message, url }) {
  await db.debugLog.create({
    data: {
      shopId,
      type,
      message,
      url,
    },
  });
}