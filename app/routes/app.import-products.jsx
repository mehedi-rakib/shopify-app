import fs from "fs";
import path from "path";
import {
  Box,
  Card,
  Layout,
  Link,
  List,
  Page,
  Text,
  BlockStack,
  DataTable,
  Checkbox,
  Thumbnail,
  Pagination,
  Button,
  Banner,
  Spinner,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { useState, useEffect } from "react";
import { DEFAULT_SUPPLIER, getBaseUrl, getLatestShopifyApiVersion } from "../config/constants";
import { json } from "@remix-run/node";
import { useLoaderData, Form } from "@remix-run/react";
import { apiVersion, authenticate } from "../shopify.server";
import db from "../db.server";
import { useSubmit, useNavigate } from "@remix-run/react";
import { useActionData } from "@remix-run/react";
// import { logDebug } from "../utils/debugLog.server";

export async function loader({ request }) {
  const { admin, session } = await authenticate.admin(request);
  const url = new URL(request.url);
  const page = url.searchParams.get("page") || 1;

  const config = await db.configuration.findUnique({
    where: { shopId: session.shop },
  });

  const baseUrl = getBaseUrl(config?.sandboxManage || false);
  const apiVersion = await getLatestShopifyApiVersion(session);
  const debugManagement = config?.debugManagement === true;

  try {
    const selectedProductValue = config?.productsManagement ? "1" : "0";
    const headers = {
      "Accept": "application/json",
      "App-ID": config?.appId || "",
      "Secret-Key": config?.secretKey || "",
      "Content-Type": "application/json",
    };

    const response = await fetch(
      `${baseUrl}/api/en/products/by-api?per_page=28&page=${page}&selected_product=${selectedProductValue}`,
      {
        method: "GET",
        headers,
      }
    );
    const { data, meta } = await response.json();

    // Log success
    // if (debugManagement) {
    //   await logDebug({
    //     shopId: session.shop,
    //     type: "success",
    //     message: "Fetched products successfully",
    //     url: `${baseUrl}/api/en/products/by-api?per_page=28&page=${page}&selected_product=${selectedProductValue}`,
    //   });
    // }


    return json({
      config,
      products: data,
      pagination: meta,
      success: null,
      error: null,
    });
  } catch (error) {
    // Log error
    // if (debugManagement) {
    //   await logDebug({
    //     shopId: session.shop,
    //     type: "warning",
    //     message: "Failed to fetch products",
    //     url: `${baseUrl}/api/en/products/by-api?per_page=28&page=${page}`,
    //   });
    // }
    console.error("Error fetching products:", error);
    return json({
      config,
      products: [],
      pagination: null,
      success: null,
      error: "Failed to fetch products",
    });
  }
}

// Action function to handle form submissions
export async function action({ request }) {
  const { admin, session } = await authenticate.admin(request);
  const formData = await request.formData();
  const selectedProducts = JSON.parse(formData.get("selectedProducts") || "[]");
  const page = new URL(request.url).searchParams.get("page") || 1;

  if (selectedProducts.length === 0) {
    return json({ success: false, error: "No products selected" });
  }

  const config = await db.configuration.findUnique({
    where: { shopId: session.shop },
  });

  const baseUrl = getBaseUrl(config?.sandboxManage || false);

  try {
    const headers = {
      "Accept": "application/json",
      "App-ID": config?.appId || "",
      "Secret-Key": config?.secretKey || "",
      "Content-Type": "application/json",
    };

    const selectedProductValue = config?.productsManagement ? "1" : "0";

    const response = await fetch(
      `${baseUrl}/api/en/products/by-api?per_page=28&page=${page}&selected_product=${selectedProductValue}`,
      {
        method: "GET",
        headers,
      }
    );
    const jsonData = await response.json();
    const currentPageProducts = jsonData.data || [];

    if (!Array.isArray(currentPageProducts)) {
      console.error("API response missing 'data' array:", jsonData);
    }

    const selectedProductDetails = currentPageProducts.filter((product) =>
      selectedProducts.includes(product.id)
    );

    const shopDomain = session.shop;
    const accessToken = session.accessToken;

    let failedProducts = [];
    let successCount = 0;
    let updatedCount = 0;

    for (const product of selectedProductDetails) {
      let shopifyProductId = null;
      try {
        const shopifyProduct = {
          product: {
            title: product.name,
            body_html: `<strong>${product.description}</strong>`,
            vendor: DEFAULT_SUPPLIER,
            product_type: "imported",
            images: product.pictures.map((url) => ({ src: url })),
            variants: [
              {
                price: product.mrp_price,
                sku: product.sku,
                inventory_quantity: product.stock,
                inventory_management: "shopify",
                inventory_policy: "deny",
                inventory_tracked: true,
              },
            ],
            metafields: [
              {
                namespace: "custom",
                key: "supplier_product_id",
                value: product.id.toString(),
                type: "single_line_text_field",
              },
            ],
          },
        };

        // STEP 1: Find the existing product by SKU using GraphQL search
        const gqlQuery = `
          query {
            products(first: 1, query: "sku:${product.id}") {
              edges {
                node {
                  id
                  title
                  variants(first: 1) {
                    edges {
                      node {
                        id
                        sku
                        inventoryItem {
                          id
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        `;

        const shopifySearchResponse = await fetch(
          `https://${shopDomain}/admin/api/${apiVersion}/graphql.json`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Shopify-Access-Token': accessToken,
            },
            body: JSON.stringify({ query: gqlQuery }),
          }
        );

        const searchData = await shopifySearchResponse.json();

        if (!searchData.data || !searchData.data.products) {
          // Log the full response for debugging
          console.error(
            `Shopify GraphQL search failed for product: ${product.name}`,
            JSON.stringify(searchData)
          );
          // Optionally, log to your debug_log table here
          failedProducts.push(product.name);
          continue; // Skip to the next product
        }

        const existingProduct = searchData.data.products.edges[0]?.node;

        if (existingProduct) {
          // Get the variant and inventory information
          const matchingVariant = existingProduct.variants.edges[0].node;
          const inventoryItemId = matchingVariant.inventoryItem.id.split('/').pop();

          // We don't need to fetch variant details anymore since we have the inventory item ID from GraphQL

          // STEP 4: Get location ID
          const locationsResponse = await fetch(
            `https://${shopDomain}/admin/api/${apiVersion}/locations.json`,
            {
              headers: {
                "Content-Type": "application/json",
                "X-Shopify-Access-Token": accessToken,
              },
            }
          );

          const locationsData = await locationsResponse.json();

          const locationId = locationsData.locations?.[0]?.id;

          if (!locationId) {
            throw new Error("No location ID found for inventory update.");
          }

          // STEP 5: Get current inventory level
          const inventoryLevelResponse = await fetch(
            `https://${shopDomain}/admin/api/${apiVersion}/inventory_levels.json?inventory_item_ids=${inventoryItemId}&location_ids=${locationId}`,
            {
              headers: {
                "Content-Type": "application/json",
                "X-Shopify-Access-Token": accessToken,
              },
            }
          );

          const inventoryLevelData = await inventoryLevelResponse.json();

          const currentLevel = inventoryLevelData.inventory_levels?.[0]?.available ?? 0;

          // STEP 6: Compare and update if needed
          const newStock = parseInt(product.stock) || 0;
          if (currentLevel !== newStock) {
            const setInventoryResponse = await fetch(
              `https://${shopDomain}/admin/api/${apiVersion}/inventory_levels/set.json`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "X-Shopify-Access-Token": accessToken,
                },
                body: JSON.stringify({
                  inventory_item_id: inventoryItemId,
                  location_id: locationId,
                  available: newStock,
                }),
              }
            );

            const setInventoryData = await setInventoryResponse.json();

            updatedCount++;
            console.log(`✅ Updated stock for: ${product.name} (SKU: ${product.id})`);
          } else {
            console.log(`ℹ️ No update needed for: ${product.name} (SKU: ${product.id})`);
          }
        } else {
          const shopifyResponse = await fetch(
            `https://${shopDomain}/admin/api/${apiVersion}/products.json`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "X-Shopify-Access-Token": accessToken,
              },
              body: JSON.stringify(shopifyProduct),
            }
          );

          const shopifyData = await shopifyResponse.json();
          shopifyProductId = shopifyData.product.id; // Shopify product ID

          successCount++;
        }
        // Attach the Shopify product ID to the product object
        product._shopifyProductId = shopifyProductId;

      } catch (err) {
        console.error(`❌ Failed to import/update product: ${product.name}`, err);
        failedProducts.push(product.name);

        // Log error
        fs.writeFileSync(
          path.join(process.cwd(), "response.log"),
          `❌ Error for product ${product.name}:\n${err.message}\n\n`,
          { flag: "a" }
        );
      }
    }

    // Product data insert to ImportedProducts
    await db.importedProducts.createMany({
      data: selectedProductDetails.map((product) => ({
        shopId: session.shop,
        product_id: product._shopifyProductId, // Use Shopify product ID
        name: product.name,
        sku: product.sku,
        wholesale_price: parseFloat(product.wholesale_price),
        mrp_price: parseFloat(product.mrp_price),
        stock: parseInt(product.stock) || 0,
        supplier: DEFAULT_SUPPLIER,
        supplier_product_id: product.id,
        picture: product.pictures?.[0] || "",
      }))
    });

    let message = `Imported ${successCount} new products, Updated ${updatedCount} products.`;

    if (failedProducts.length > 0) {
      return json({
        success: false,
        error: `${message} Failed to import ${failedProducts.length} products: ${failedProducts.join(
          ", "
        )}`,
      });
    }

    return json({ success: true, message });
  } catch (err) {
    console.error("❌ Error importing/updating products:", err);

    // Log main error
    fs.writeFileSync(
      path.join(process.cwd(), "response.log"),
      `❌ Main Error:\n${err.message}\n\n`,
      { flag: "a" }
    );

    return json({ success: false, error: "Unexpected error occurred." });
  }
}



// ImportProductPage component
export default function ImportProductPage() {
  const { config, products, pagination } = useLoaderData();
  const actionData = useActionData();
  const navigate = useNavigate();
  const [selectedRows, setSelectedRows] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const submit = useSubmit();

  // Add this useEffect to reset selections after form submission
  useEffect(() => {
    if (actionData?.success || actionData?.error) {
      setSelectedRows([]);
      setSelectAll(false);
      setIsLoading(false);
    }
  }, [actionData]);

  const handleSubmit = (event) => {
    console.log("Submitting selected products:", selectedRows);
    event.preventDefault();
    setIsLoading(true);
    submit(event.currentTarget);
  };

  const handlePageChange = (page) => {
    navigate(`/app/import-products?page=${page}`);
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedRows([]);
    } else {
      setSelectedRows(products.map((product) => product.id));
    }
    setSelectAll(!selectAll);
  };

  const handleRowSelect = (id) => {
    if (selectedRows.includes(id)) {
      setSelectedRows(selectedRows.filter((rowId) => rowId !== id));
      setSelectAll(false);
    } else {
      setSelectedRows([...selectedRows, id]);
      if (selectedRows.length + 1 === products.length) {
        setSelectAll(true);
      }
    }
  };

  const rows =
    products?.map((product) => [
      <Checkbox
        checked={selectedRows.includes(product.id)}
        onChange={() => handleRowSelect(product.id)}
      />,
      product.name,
      <Text color={product.stock > 0 ? "success" : "critical"}>
        {product.stock}
      </Text>,
      `$${product.mrp_price}`,
      `$${product.wholesale_price}`,
      DEFAULT_SUPPLIER,
      product.id,
      <Thumbnail
        source={
          product.pictures?.[1] ||
          product.pictures?.[0] ||
          "https://cdn.shopify.com/s/files/1/0533/2089/files/placeholder-images-image_large.png"
        }
        alt={product.name}
        onError={(e) => {
          e.currentTarget.src = "https://cdn.shopify.com/s/files/1/0533/2089/files/placeholder-images-image_large.png";
        }}
      />,
    ]) || [];

  return (
    <Page fullWidth>
      <TitleBar title="Import Products" />
      <Layout>
        <Layout.Section>
          {actionData?.success && (
            <Banner status="success">{actionData.message}</Banner>
          )}
          {actionData?.error && (
            <Banner status="critical">{actionData.error}</Banner>
          )}
          <Form method="post" onSubmit={handleSubmit}>
            <input type="hidden" name="selectedProducts" value={JSON.stringify(selectedRows)} />
            <Box padding="4">
              <Button primary submit disabled={selectedRows.length === 0 || isLoading}>
                {isLoading ? (
                  <Box display="flex" style={{ alignItems: "center", gap: "8px" }}>
                    <Spinner size="small" />
                    <Text>Importing Products...</Text>
                  </Box>
                ) : (
                  `Import Selected Products (${selectedRows.length})`
                )}
              </Button>
            </Box>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: "16px",
                marginBottom: "24px",
              }}
            >
              {products?.map((product) => (
                <Card key={product.id} sectioned>
                  <Box display="flex" alignItems="center" gap="4">
                    <Checkbox
                      checked={selectedRows.includes(product.id)}
                      onChange={() => handleRowSelect(product.id)}
                    />
                    <Thumbnail
                      source={
                        product.pictures?.[1] ||
                        product.pictures?.[0] ||
                        "https://cdn.shopify.com/s/files/1/0533/2089/files/placeholder-images-image_large.png"
                      }
                      alt={product.name}
                      size="large"
                      onError={(e) => {
                        e.currentTarget.src =
                          "https://cdn.shopify.com/s/files/1/0533/2089/files/placeholder-images-image_large.png";
                      }}
                    />
                  </Box>
                  <Box>
                    <Text variant="headingMd">{product.name}</Text>
                    <Text>SKU: <strong>{product.sku}</strong></Text> {/* Show SKU */}
                    <Text color={product.stock > 0 ? "success" : "critical"}>
                      Stock: {product.stock}
                    </Text>
                    <Text>MRP: ${product.mrp_price}</Text>
                    <Text>Wholesale: ${product.wholesale_price}</Text>
                    <Text>Supplier: {DEFAULT_SUPPLIER}</Text>
                    <Text>Supplier Product ID: {product.id}</Text>
                  </Box>
                </Card>
              ))}
            </div>
            {pagination && (
              <Box padding="4">
                <Pagination
                  label={`Page ${pagination.current_page} of ${pagination.last_page}`}
                  hasPrevious={pagination.current_page > 1}
                  hasNext={pagination.current_page < pagination.last_page}
                  onPrevious={() => handlePageChange(pagination.current_page - 1)}
                  onNext={() => handlePageChange(pagination.current_page + 1)}
                />
              </Box>
            )}
          </Form>
        </Layout.Section>
      </Layout>
    </Page>
  );
}