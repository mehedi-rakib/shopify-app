-- CreateTable
CREATE TABLE "ImportedProducts" (
   "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "shopId" TEXT,
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
