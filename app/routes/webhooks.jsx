import { authenticate } from "../shopify.server";

export const action = async ({ request }) => {
  const { topic, shop, session, admin, payload } = await authenticate.webhook(request);

  if (!admin) {
    return new Response("Unauthorized", { status: 401 });
  }

  switch (topic) {
    case "PRODUCTS_UPDATE":
      console.log("Product updated:", payload);
  }
};