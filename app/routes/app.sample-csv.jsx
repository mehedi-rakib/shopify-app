import {
  Page,
  Layout,
  Card,
  RadioButton,
  Text,
  Box,
  BlockStack,
  InlineStack,
  Banner,
  Spinner,
  Button,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { useState, useEffect } from "react";
import { useLoaderData } from "@remix-run/react";
import { authenticate } from "../shopify.server";
import { getBaseUrl } from "../config/constants";
import db from "../db.server";
import { json } from "@remix-run/node";
import axios from "axios";

export async function loader({ request }) {
  const { admin, session } = await authenticate.admin(request);
  const config = await db.configuration.findUnique({
    where: { shopId: session.shop },
  });

  return json({
    config,
    success: null,
    error: null,
  });
}

export default function SampleCSVPage() {
  const { config } = useLoaderData();
  const [selected, setSelected] = useState("all-products");
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pageCount, setPageCount] = useState(0);

  const baseUrl = getBaseUrl(config?.sandboxManage || false);

  const fetchProducts = async () => {
    setLoading(true);
    setError(null);
    setPageCount(0);

    try {
      let allProducts = [];
      let page = 1;
      const perPage = 300;
      let hasMore = true;

      while (hasMore) {
        const selectedProductValue = selected === "selected-products" ? 1 : 0;
        const url = `${baseUrl}/api/en/products/by-api?page=${page}&per_page=${perPage}&selected_product=${selectedProductValue}`;

        const headers = {
          "Accept": "application/json",
          "App-ID": config?.appId || "",
          "Secret-Key": config?.secretKey || "",
          "Content-Type": "application/json",
        };

        const response = await axios.get(url, { headers });

        const newProducts = Array.isArray(response.data?.data) ? response.data.data : [];

        allProducts = [...allProducts, ...newProducts];
        setPageCount(page);

        if (newProducts.length < perPage) {
          hasMore = false;
        } else {
          page += 1;
        }
      }

      setProducts(allProducts);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };


  const generateCSV = () => {
    if (!products.length) return;

    const escapeCsvField = (field) => {
      if (field === null || field === undefined) return "";
      const stringField = String(field);
      if (stringField.includes(",") || stringField.includes('"') || stringField.includes("\n")) {
        return `"${stringField.replace(/"/g, '""')}"`;
      }
      return stringField;
    };

    const formatPictures = (pictures) => {
      if (!pictures) return "";
      return Array.isArray(pictures)
        ? pictures.map((p) => (typeof p === "string" ? p : "")).join(";")
        : pictures;
    };

    const getPrice = (product) => {
      return product.product_reseller_price || product.mrp_price || "";
    };

    const headers = [
      "Product ID",
      "Name",
      "Description",
      "Price",
      "Variant Inventory Qty",
      "Variant Inventory Tracker",
      "SKU",
      "Image Src",
      "Type",
      "Published",
      "Status",
    ];

    const rows = products.map((product) => [
      escapeCsvField(product.id),
      escapeCsvField(product.name),
      escapeCsvField(product.description),
      escapeCsvField(getPrice(product)),
      escapeCsvField(product.stock),
      escapeCsvField("shopify"),
      escapeCsvField(product.sku),
      escapeCsvField(formatPictures(product.pictures)),
      escapeCsvField("imported"),
      escapeCsvField("TRUE"),
      escapeCsvField("active"),
    ]);

    const BOM = "\uFEFF";
    const csvContent = BOM + [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `products-${selected}-${new Date().toISOString().split("T")[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    setProducts([]);
  }, [selected]);

  const handleChange = (value) => {
    setSelected(value);
  };

  return (
    <Page fullWidth>
      <TitleBar title="Product Management" />
      <Layout>
        <Layout.Section>
          <Card>
            <Box padding="4">
              <BlockStack gap="4">
                <Text variant="headingMd" as="h2">
                  Select Product Source
                </Text>
                <InlineStack gap="4">
                  <RadioButton
                    label="All Products"
                    checked={selected === "all-products"}
                    id="all-products"
                    name="products"
                    onChange={() => handleChange("all-products")}
                  />
                  <RadioButton
                    label="Selected Product"
                    checked={selected === "selected-products"}
                    id="selected-products"
                    name="products"
                    onChange={() => handleChange("selected-products")}
                  />
                </InlineStack>

                {!loading && products.length === 0 && (
                  <Box>
                    <Button onClick={fetchProducts} primary>
                      Load Products
                    </Button>
                  </Box>
                )}

                {loading && (
                  <Box padding="4" alignment="center">
                    <Spinner accessibilityLabel="Loading products" size="large" />
                    {pageCount > 0 && (
                      <Text alignment="center" variant="bodyMd">
                        Loading page {pageCount}...
                      </Text>
                    )}
                  </Box>
                )}

                {error && <Banner status="critical">{error}</Banner>}

                {products.length > 0 && !loading && (
                  <Box>
                    <Text variant="bodyMd">
                      Loaded {products.length} products from {selected} source.
                    </Text>
                    <Button onClick={generateCSV} primary>
                      Download CSV
                    </Button>
                  </Box>
                )}
              </BlockStack>
            </Box>
          </Card>

          <Card>
            <Box padding="4">
              <BlockStack gap="4">
                <Text variant="headingMd" as="h2">
                  How to Upload Your CSV File
                </Text>
                <Text variant="bodyMd" as="p">
                  Follow these steps to upload your product CSV file:
                </Text>
                <ol style={{ paddingLeft: '1.25rem' }}>
                  <li>
                    <Text variant="bodySm">
                      Prepare your file using our sample format. You can <strong>download the sample CSV</strong> below.
                    </Text>
                  </li>
                  <li>
                    <Text variant="bodySm">
                      Click on the <strong>"Choose file"</strong> button or drag and drop your CSV file into the upload area.
                    </Text>
                  </li>
                  <li>
                    <Text variant="bodySm">
                      After selecting the file, click <strong>"Upload"</strong> to begin the import.
                    </Text>
                  </li>
                  <li>
                    <Text variant="bodySm">
                      Wait for the upload to finish. You’ll see a <strong>confirmation or error message</strong> when it's done.
                    </Text>
                  </li>
                </ol>
              </BlockStack>
            </Box>
          </Card>


        </Layout.Section>
      </Layout>
    </Page>
  );
}
