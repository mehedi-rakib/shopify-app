import { json } from "@remix-run/node";
import fs from "fs";
import path from "path";
import db from "../db.server";
import { DEFAULT_SUPPLIER, getBaseUrl } from "../config/constants"; // <-- Import here

export const loader = async ({ request }) => {
  console.log("Received request:", request);
};

export const action = async ({ request }) => {
  const data = await request.json();

  // Fetch configuration from DB
  const config = await db.configuration.findFirst();
  const fullOrderManage = config?.fullOrderManage === true;
  const orderManage = config?.orderManage === true;

  // Get all SKUs from request
  const requestSkus = data.line_items.map(item => item.sku);

  // Fetch imported products matching SKUs
  const importedProducts = await db.importedProducts.findMany({
    where: { sku: { in: requestSkus } }
  });

  // Helper to get wholesale_price by SKU
  const getWholesalePrice = sku => {
    const product = importedProducts.find(p => p.sku === sku);
    return product ? product.wholesale_price : ""; // fallback if not found
  };

  // Prepare order_details
  const order_details = data.line_items.map(item => ({
    supplier: item.vendor,
    sku: item.sku,
    supplier_product_id: "",
    product_id: item.id,
    quantity: item.current_quantity,
    wholesale_price: getWholesalePrice(item.sku), // <-- Set from importedProducts
    mrp_price: item.price,
    unit_price: item.price,
    total_price: item.price * item.current_quantity,
    discount: "",
    reward_point_used: 0,
    product: {
      id: item.id,
      name: item.name,
      supplier: item.vendor,
      sku: item.sku,
      supplier_product_id: "",
      unit_price: item.price,
      sales_price: item.price
    }
  }));

  // Check if all vendors match DEFAULT_SUPPLIER
  const allMatch = order_details.every(
    item => item.supplier === DEFAULT_SUPPLIER
  );

  // Set reseller_package_type only if all products are from DEFAULT_SUPPLIER
  let reseller_package_type = "0";
  if (allMatch) {
    reseller_package_type = fullOrderManage ? "1" : "0";
    console.log("All Products are from default suppliers");
  } else {
    console.log("All Products are not from default suppliers");
  }

  // Conditionally set shipping_address and user
  let shipping_address = {};
  let user = {};

  if (orderManage) {
    shipping_address = {
      name: data.billing_address.name,
      email: data.customer.email,
      address: data.billing_address.address1,
      city_id: data.billing_address.city,
      state: "",
      zone_id: "",
      city: data.billing_address.city,
      area_id: null,
      area: null,
      phone: ""
    };
    user = {
      id: data.customer.id ? data.customer.id : "",
      name: data.billing_address.name ? data.billing_address.name : "",
      email: data.customer.email ? data.customer.email : "",
    };
    console.log("Order management is enabled, shipping_address and user are set.");
  } else {
    // If orderManage is false, set empty or alternative values
    shipping_address = {};
    user = {};
    console.log("Order management is disabled, shipping_address and user are set to empty.");
  }

  // Build payload
  const payload = {
    reseller_package_type: allMatch ? (fullOrderManage ? "1" : "0") : "0",
    platform_order_id: data.id,
    platform_user_id: data.customer.id,
    order_source: data.source_name,
    platform_source: "",
    shipping_address,
    payment_type: "cash_on_delivery",
    payment_status: "COD",
    delivery_status: "Shipped",
    date: data.customer.created_at,
    note: null,
    is_recurring: 1,
    grand_total: data.subtotal_price,
    shipping_cost: 0,
    coupon_code: null,
    coupon_discount: 0,
    reward_point_used: 0,
    order_details,
    user
  };

  console.log("Payload to be sent:", payload);

  // Reuse allMatch variable from earlier check

  if (!allMatch) {
    console.log("Not all vendors match the default supplier. Skipping API call.");
    return json({
      received: true,
      message: "Some products do not match the default supplier. API call skipped.",
    });
  } else {
    console.log("All vendors match the default supplier.");
  }

  const sandboxManage = config?.sandboxManage === true;
  const baseUrl = getBaseUrl(sandboxManage);
  const appId = config?.appId;
  const secretKey = config?.secretKey;
  // Collect SKUs for stock check
  const stockCheckSkus = payload.order_details.map(item => item.sku);

  // Call stock API
  const stockApiUrl = `${baseUrl}/api/en/products/by-api?${stockCheckSkus.map(sku => `skus[]=${sku}`).join("&")}`;
  const stockResponse = await fetch(stockApiUrl, {
    method: "GET",
    headers: {
      "Accept": "application/json",
      "App-ID": appId,
      "Secret-Key": secretKey,
    },
  });
  console.log("API Credentials:", appId, secretKey);
  const stockData = await stockResponse.json();

  // Check stock for each SKU
  const outOfStock = stockData.data.some(product => product.stock <= 0);

  if (outOfStock) {
    console.log("One or more products are out of stock. Order not created.");
    return json({
      received: true,
      message: "One or more products are out of stock. Order not created.",
    });
  } else {
    console.log("All products are in stock. Proceeding with order creation.");
  }


  // Send the custom payload to third-party API
  const thirdPartyResponse = await fetch(`${baseUrl}/api/orders/store`, {
    method: "POST",
    headers: {
      "Accept": "application/json",
      "App-ID": appId,
      "Secret-Key": secretKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const thirdPartyResult = await thirdPartyResponse.json();


  // Insert into OrderLog after successful order creation
  await db.orderLog.create({
    data: {
      shopId: config.shopId,
      order_id: data.id,
      supplier_order_id: thirdPartyResult.order_id ? thirdPartyResult.order_id : null,
    }
  });
  console.log("Third-party API response:", thirdPartyResult);
  return json({
    received: true,
    thirdPartyResult,

  });
};
