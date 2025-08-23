import { json } from "@remix-run/node";
import db from "../db.server";
import { title } from "process";


export const action = async ({ request }) => {
  const apiKey = request.headers.get("x-api-key");
  const { sku, supplier, name, price, cost, stock } = await request.json();


  // Fetch the first configuration record
  const config = await db.configuration.findFirst();
  if (apiKey !== config.authToken) {
    return json({ error: "Unauthorized" }, { status: 401 });
  }


  // Find the product in ImportedProducts by sku and supplier
  const importedProduct = await db.importedProducts.findFirst({
    where: {
      sku,
      supplier,
    },
  });
  if (!importedProduct) {
    console.error("Product not found:", sku, supplier);
    return json({ error: "Product not found" }, { status: 404 });
  } else {
    console.log("Product found:", importedProduct);
  }

  const productId = importedProduct.product_id.toString();
  // console.log('opppss ',productId);


  const accessToken = await db.session.findFirst();
  const shop = await db.session.findFirst();


  const response = await fetch(
    `https://${shop.shop}/admin/api/2025-07/products/${productId}.json`,
    {
      method: "PUT",
      headers: {
        "X-Shopify-Access-Token": accessToken.accessToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        product: {
          id: productId,
          title: name ? name : importedProduct.name,
          variants: [
            {
              inventory_quantity: stock,
              sku: importedProduct.sku,
              price: price ? price : importedProduct.mrp_price,
              cost: cost ? cost : importedProduct.wholesale_price,
            },
          ],
        },
      }),
    }
  );

  const data = await response.json();

  // Update ImportedProducts table
  await db.importedProducts.update({
    where: { id: importedProduct.id },
    data: {
      stock,
      mrp_price: price ? parseFloat(price) : importedProduct.mrp_price,
      wholesale_price: cost ? parseFloat(cost) : importedProduct.wholesale_price,
      name: name ? name : importedProduct.name,
    },
  });

  console.log("Product updated in ImportedProducts");
  return json({
    success: true, message: "Product updated successfully", data: {
      sku: sku,
      supplier: supplier,
      name: name,
      price: price,
      stock: stock
    }
  });
};