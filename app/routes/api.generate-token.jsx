import { json } from "@remix-run/node";
import db from "../db.server"; // adjust path as needed
import { authenticate } from "../shopify.server";
import crypto from "crypto";



export const action = async ({ request }) => {
    const { session } = await authenticate.admin(request);
    // Get shopId from session
    const shopId = session.shop; // adjust key if needed

    if (!shopId) {
        return json({ error: "Shop ID not found in session" }, { status: 400 });
    }

    // Generate a secure 64-character token
    const newToken = crypto.randomBytes(32).toString("hex");

    // Update the Configuration table using shopId
    await db.configuration.update({
        where: { shopId },
        data: { authToken: newToken },
    });

    return json({ token: newToken });
};