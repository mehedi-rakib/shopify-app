-- CreateTable
CREATE TABLE "Configuration" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "shopId" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "secretKey" TEXT NOT NULL,
    "orderManage" BOOLEAN NOT NULL DEFAULT false,
    "sandboxManage" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Configuration_shopId_key" ON "Configuration"("shopId");
