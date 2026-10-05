-- CreateEnum
CREATE TYPE "PetFriendlyPlaceType" AS ENUM ('PARK', 'CAFE', 'RESTAURANT', 'SHOPPING', 'OTHER');

-- AlterTable
ALTER TABLE "Meetup" ADD COLUMN     "petFriendlyPlaceId" TEXT;

-- CreateTable
CREATE TABLE "PetFriendlyPlace" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "PetFriendlyPlaceType" NOT NULL,
    "address" TEXT NOT NULL,
    "commune" TEXT NOT NULL,
    "city" TEXT NOT NULL DEFAULT 'Santiago',
    "latitude" DECIMAL(9,6),
    "longitude" DECIMAL(9,6),
    "photoUrl" TEXT,
    "description" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PetFriendlyPlace_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PetFriendlyPlace_active_type_idx" ON "PetFriendlyPlace"("active", "type");

-- CreateIndex
CREATE INDEX "PetFriendlyPlace_active_commune_idx" ON "PetFriendlyPlace"("active", "commune");

-- CreateIndex
CREATE INDEX "Meetup_petFriendlyPlaceId_idx" ON "Meetup"("petFriendlyPlaceId");

-- AddForeignKey
ALTER TABLE "Meetup" ADD CONSTRAINT "Meetup_petFriendlyPlaceId_fkey" FOREIGN KEY ("petFriendlyPlaceId") REFERENCES "PetFriendlyPlace"("id") ON DELETE SET NULL ON UPDATE CASCADE;
