import { json, redirect } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import db from "../db.server";
import {
  Button,
  Card,
  Page,
  Banner,
  DataTable,
  Box,
  Text,
  InlineStack,
  Pagination,
} from "@shopify/polaris";
import { useState } from "react";

// Loader: fetch all debug log entries
export async function loader() {
  const logs = await db.DebugLog.findMany({
    orderBy: { createdAt: "desc" },
  });
  return json({ logs });
}

// Action: delete all debug log entries
export async function action({ request }) {
  const formData = await request.formData();
  if (formData.get("deleteAll") === "true") {
    try {
      await db.DebugLog.deleteMany({});
      return redirect("/app/debug-log");
    } catch (err) {
      console.error("Failed to delete logs:", err);
      return json({ error: "Failed to delete logs" });
    }
  }
  return null;
}

export default function DebugLogPage() {
  const { logs } = useLoaderData();

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10; // Number of rows per page

  // Sequential numbers instead of DB IDs
  const rows = logs.map((log, index) => [
    index + 1,
    <Text tone={log.type === "success" ? "success" : log.type === "warning" ? "warning" : "critical"}>
      {log.type}
    </Text>,
    <Text truncate>{log.message}</Text>,
    <Text truncate>{log.url}</Text>,
    <Text>{new Date(log.createdAt).toLocaleString()}</Text>,
  ]);

  // Paginated rows
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedRows = rows.slice(startIndex, startIndex + pageSize);

  return (
    <Page fullWidth>
      <Card>

        {/* Header with Delete button */}
        <Box padding="4">
          <InlineStack align="space-between">
            <Text variant="headingMd">Debug Logs</Text>
            <form
              method="post"
              onSubmit={(e) => {
                if (!window.confirm("Are you sure you want to delete all debug logs?")) {
                  e.preventDefault();
                }
              }}
            >
              <input type="hidden" name="deleteAll" value="true" />
              <Button destructive variant="primary" submit>
                Delete All Logs
              </Button>
            </form>
          </InlineStack>
        </Box>

        {/* Logs table */}
        <DataTable
          columnContentTypes={["numeric", "text", "text", "text", "text"]}
          headings={["#", "Type", "Message", "URL", "Created At"]}
          rows={paginatedRows}
        />

        {/* Pagination controls */}
        <Box padding="4">
          <Pagination
            hasPrevious={currentPage > 1}
            onPrevious={() => setCurrentPage((p) => p - 1)}
            hasNext={currentPage * pageSize < rows.length}
            onNext={() => setCurrentPage((p) => p + 1)}
          />
        </Box>
      </Card>
    </Page>
  );
}
