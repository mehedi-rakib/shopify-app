import {
  Box,
  Card,
  Layout,
  Page,
  Text,
  DataTable,
  Thumbnail,
  Banner,
  Button,
  Select,
  Tooltip
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { DEFAULT_SUPPLIER, getLatestShopifyApiVersion } from "../config/constants";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { authenticate } from "../shopify.server";
import { useSubmit, useNavigate } from "@remix-run/react";
import { useLocation } from "@remix-run/react";

export async function loader({ request }) {
  const { admin, session } = await authenticate.admin(request);
  const apiVersion = await getLatestShopifyApiVersion(session);

  // Get limit from URL params or use default value
  const url = new URL(request.url);
  const limit = parseInt(url.searchParams.get('limit')) || 50;

  // Add console logs to help debug
  // console.log('Shop URL:', session.shop);
  // console.log('API Version:', apiVersion);
  // console.log('Default Supplier:', DEFAULT_SUPPLIER);
  // console.log('Products Limit:', limit);

  try {
    // Fetch products from Shopify API with dynamic limit
    const response = await fetch(
      `https://${session.shop}/admin/api/${apiVersion}/products.json?vendor=${encodeURIComponent(DEFAULT_SUPPLIER)}&limit=${limit}`,
      {
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": session.accessToken,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    const products = data.products || [];

    return json({
      products,
      error: null,
      shop: session.shop // Add shop URL to the returned data
    });
  } catch (error) {
    console.error("Error fetching imported products:", error);
    return json({
      products: [],
      error: `Failed to fetch imported products: ${error.message}`,
      shop: null
    });
  }
}

export default function ImportedProductsPage() {
  const { products, error, shop } = useLoaderData();
  const navigate = useNavigate();
  const location = useLocation();
  const currentLimit = new URLSearchParams(location.search).get('limit') || '50';

  const handleLimitChange = (event) => {
    const value = parseInt(event.target.value) || 50;
    // Ensure the value is at least 1 and not more than total products
    const safeValue = Math.max(1, Math.min(value, 500));
    navigate(`?limit=${safeValue}`);
  };

  const rows = products?.map((product, index) => {
    const variant = product.variants[0] || {};
    const image = product.images[0] || {};
    const inventory = typeof variant.inventory_quantity === 'number' ? variant.inventory_quantity : 0;
    const price = variant.price ? `$${variant.price}` : "$0.00";
    const sku = variant.sku || "N/A";
    const imageSrc = image.src || "";

    return [
      index + 1,
      product.title || "Untitled",
      sku,
      inventory,
      price,
      product.vendor || "Unknown",
      <Thumbnail source={imageSrc} alt={product.title || "Image"} />,
      <Box display="flex" gap="2">
        <Tooltip content="Preview product">
          <Button
            size="slim"
            onClick={() => window.open(`https://${shop}/products/${product.handle}`, '_blank')}
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16" fill="currentColor">
                <path fillRule="evenodd" d="M11 8a3 3 0 1 1-6 0 3 3 0 0 1 6 0m-1.5 0a1.5 1.5 0 1 1-3.001-.001 1.5 1.5 0 0 1 3.001.001" />
                <path fillRule="evenodd" d="M8 2c-2.476 0-4.348 1.23-5.577 2.532a9.3 9.3 0 0 0-1.4 1.922 6 6 0 0 0-.37.818c-.082.227-.153.488-.153.728s.071.501.152.728c.088.246.213.524.371.818.317.587.784 1.27 1.4 1.922 1.229 1.302 3.1 2.532 5.577 2.532s4.348-1.23 5.577-2.532a9.3 9.3 0 0 0 1.4-1.922c.158-.294.283-.572.37-.818.082-.227.153-.488.153-.728s-.071-.501-.152-.728a6 6 0 0 0-.371-.818 9.3 9.3 0 0 0-1.4-1.922c-1.229-1.302-3.1-2.532-5.577-2.532m-5.999 6.002v-.004c.004-.02.017-.09.064-.223.058-.161.15-.369.278-.608a7.8 7.8 0 0 1 1.17-1.605c1.042-1.104 2.545-2.062 4.487-2.062s3.445.958 4.486 2.062c.52.55.912 1.126 1.17 1.605.13.24.221.447.279.608.047.132.06.203.064.223v.004c-.004.02-.017.09-.064.223-.058.161-.15.369-.278.608a7.8 7.8 0 0 1-1.17 1.605c-1.042 1.104-2.545 2.062-4.487 2.062s-3.445-.958-4.486-2.062a7.7 7.7 0 0 1-1.17-1.605 4.5 4.5 0 0 1-.279-.608c-.047-.132-.06-.203-.064-.223" />
              </svg>
            }
          />
        </Tooltip>||
        <Tooltip content="Edit product">
          <Button
            size="slim"
            onClick={() => {
              window.open(`https://admin.shopify.com/store/${shop.split('.')[0]}/products/${product.id}`, '_blank');
            }}
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16" fill="currentColor">
                <path d="M13.44 2.56a1.914 1.914 0 0 0-2.707 0L3.338 9.956a.307.307 0 0 0-.081.135l-.907 3.627a.308.308 0 0 0 .373.373l3.627-.907a.307.307 0 0 0 .135-.081l7.395-7.395a1.914 1.914 0 0 0 0-2.707zM4.275 13.038l-.625.625a.317.317 0 0 1-.447-.447l.625-.625.447.447z" />
              </svg>
            }
          />
        </Tooltip>
      </Box>
    ];
  }) || [];


  return (
    <Page fullWidth>
      <TitleBar title={`Imported Products`} />
      <Layout>
        <Layout.Section>
          {error && (
            <Banner status="critical">{error}</Banner>
          )}
          <Card>
            <Box padding="4">
              <Box display="flex" alignItems="center" gap="3">
                <Text as="label" htmlFor="limitInput">Products per page:</Text>
                <input
                  id="limitInput"
                  type="number"
                  min="1"
                  max="250"
                  defaultValue={currentLimit}
                  onChange={handleLimitChange}
                  style={{
                    padding: '8px',
                    borderRadius: '4px',
                    border: '1px solid #ccc',
                    width: '100px'
                  }}
                />
              </Box>
            </Box>
            <DataTable
              columnContentTypes={[
                "text",
                "text",
                "text",
                "numeric",
                "numeric",
                "text",
                "text",
                "text"
              ]}
              headings={[
                "SL",
                "Name",
                "SKU",
                "Stock",
                "Price",
                "Supplier",
                "Image",
                "Actions"
              ]}
              rows={rows}
              hoverable
            />
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}