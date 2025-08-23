import {
    Box,
    Card,
    Layout,
    Page,
    Text,
    DataTable,
    Banner,
    Button,
    Tooltip
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import db from "../db.server";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
    const { session } = await authenticate.admin(request);
    const orders = await db.orderLog.findMany({
        orderBy: { createdAt: "desc" }
    });

    // Convert BigInt fields to string
    const safeOrders = orders.map(order => ({
        ...order,
        order_id: order.order_id?.toString(),
        supplier_order_id: order.supplier_order_id?.toString(),
    }));

    return json({ orders: safeOrders });
};

export default function OrderLogPage() {
    const { orders } = useLoaderData();
    
    const shop = orders.length > 0 ? orders[0].shopId : '';

    const rows = orders.map((order, idx) => [
        idx + 1,
        order.shopId,
        order.order_id,
        order.supplier_order_id,
        new Date(order.createdAt).toLocaleString(),
        <Box display="flex" gap="2">
            <Tooltip content="Preview Order">
                <Button
                    size="slim"
                  onClick={() => window.open(`https://admin.shopify.com/store/${shop.split('.')[0]}/orders/${order.order_id}`, '_blank')}
                    icon={
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16" fill="currentColor">
                            <path fillRule="evenodd" d="M11 8a3 3 0 1 1-6 0 3 3 0 0 1 6 0m-1.5 0a1.5 1.5 0 1 1-3.001-.001 1.5 1.5 0 0 1 3.001.001" />
                            <path fillRule="evenodd" d="M8 2c-2.476 0-4.348 1.23-5.577 2.532a9.3 9.3 0 0 0-1.4 1.922 6 6 0 0 0-.37.818c-.082.227-.153.488-.153.728s.071.501.152.728c.088.246.213.524.371.818.317.587.784 1.27 1.4 1.922 1.229 1.302 3.1 2.532 5.577 2.532s4.348-1.23 5.577-2.532a9.3 9.3 0 0 0 1.4-1.922c.158-.294.283-.572.37-.818.082-.227.153-.488.153-.728s-.071-.501-.152-.728a6 6 0 0 0-.371-.818 9.3 9.3 0 0 0-1.4-1.922c-1.229-1.302-3.1-2.532-5.577-2.532m-5.999 6.002v-.004c.004-.02.017-.09.064-.223.058-.161.15-.369.278-.608a7.8 7.8 0 0 1 1.17-1.605c1.042-1.104 2.545-2.062 4.487-2.062s3.445.958 4.486 2.062c.52.55.912 1.126 1.17 1.605.13.24.221.447.279.608.047.132.06.203.064.223v.004c-.004.02-.017.09-.064.223-.058.161-.15.369-.278.608a7.8 7.8 0 0 1-1.17 1.605c-1.042 1.104-2.545 2.062-4.487 2.062s-3.445-.958-4.486-2.062a7.7 7.7 0 0 1-1.17-1.605 4.5 4.5 0 0 1-.279-.608c-.047-.132-.06-.203-.064-.223" />
                        </svg>
                    }
                />
            </Tooltip>
        </Box>
    ]);

    return (
        <Page fullWidth>
            <TitleBar title="Order Log" />
            <Layout>
                <Layout.Section>
                    <Card>
                        <DataTable
                            columnContentTypes={[
                                "text",
                                "text",
                                "text",
                                "text",
                                "text",
                                "text"
                            ]}
                            headings={[
                                "SL",
                                "Shop ID",
                                "Order ID",
                                "Supplier Order ID",
                                "Created At",
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