-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Configuration" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "shopId" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "secretKey" TEXT NOT NULL,
    "orderManage" BOOLEAN NOT NULL DEFAULT false,
    "sandboxManage" BOOLEAN NOT NULL DEFAULT false,
    "fullOrderManage" BOOLEAN NOT NULL DEFAULT false,
    "productsManagement" BOOLEAN NOT NULL DEFAULT false,
    "debugManagement" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Configuration" ("appId", "createdAt", "fullOrderManage", "id", "orderManage", "sandboxManage", "secretKey", "shopId", "updatedAt") SELECT "appId", "createdAt", "fullOrderManage", "id", "orderManage", "sandboxManage", "secretKey", "shopId", "updatedAt" FROM "Configuration";
DROP TABLE "Configuration";
ALTER TABLE "new_Configuration" RENAME TO "Configuration";
CREATE UNIQUE INDEX "Configuration_shopId_key" ON "Configuration"("shopId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
