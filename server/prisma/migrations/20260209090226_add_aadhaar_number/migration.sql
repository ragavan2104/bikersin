/*
  Warnings:

  - Added the required column `aadhaarNumber` to the `Bike` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Bike" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "regNo" TEXT NOT NULL,
    "aadhaarNumber" TEXT NOT NULL,
    "boughtPrice" REAL NOT NULL,
    "soldPrice" REAL,
    "isSold" BOOLEAN NOT NULL DEFAULT false,
    "companyId" TEXT NOT NULL,
    "addedById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Bike_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Bike_addedById_fkey" FOREIGN KEY ("addedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Bike" ("addedById", "boughtPrice", "companyId", "createdAt", "id", "isSold", "name", "regNo", "soldPrice", "updatedAt", "aadhaarNumber") SELECT "addedById", "boughtPrice", "companyId", "createdAt", "id", "isSold", "name", "regNo", "soldPrice", "updatedAt", "000000000000" FROM "Bike";
DROP TABLE "Bike";
ALTER TABLE "new_Bike" RENAME TO "Bike";
CREATE UNIQUE INDEX "Bike_regNo_key" ON "Bike"("regNo");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
