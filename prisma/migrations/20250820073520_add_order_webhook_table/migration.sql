/*
  Warnings:

  - Made the column `shopId` on table `ImportedProducts` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateTable
CREATE TABLE "OrderWebhook" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "shop" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ImportedProducts" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "shopId" TEXT NOT NULL,
    "product_id" BIGINT NOT NULL,
    "name" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "wholesale_price" REAL NOT NULL,
    "mrp_price" REAL NOT NULL,
    "stock" INTEGER NOT NULL,
    "supplier" TEXT NOT NULL,
    "supplier_product_id" INTEGER NOT NULL,
    "picture" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_ImportedProducts" ("createdAt", "id", "mrp_price", "name", "picture", "product_id", "shopId", "sku", "stock", "supplier", "supplier_product_id", "updatedAt", "wholesale_price") SELECT "createdAt", "id", "mrp_price", "name", "picture", "product_id", "shopId", "sku", "stock", "supplier", "supplier_product_id", "updatedAt", "wholesale_price" FROM "ImportedProducts";
DROP TABLE "ImportedProducts";
ALTER TABLE "new_ImportedProducts" RENAME TO "ImportedProducts";
CREATE UNIQUE INDEX "ImportedProducts_product_id_key" ON "ImportedProducts"("product_id");
CREATE UNIQUE INDEX "ImportedProducts_sku_key" ON "ImportedProducts"("sku");
CREATE UNIQUE INDEX "ImportedProducts_supplier_product_id_key" ON "ImportedProducts"("supplier_product_id");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "OrderWebhook_shop_orderId_idx" ON "OrderWebhook"("shop", "orderId");
