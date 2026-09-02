/*
  Warnings:

  - Changed the type of `type` on the `Booking` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `experienceType` on the `Package` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('DAY_TOURISM', 'HURDA_PARTY', 'BIRTHDAY', 'WEDDING', 'DESTINATION_WEDDING', 'ENGAGEMENT', 'ANNIVERSARY', 'CORPORATE_EVENT', 'SCHOOL_COLLEGE_PICNIC', 'FAMILY_DAY_OUT', 'OTHER_EVENT');

-- DropForeignKey
ALTER TABLE "Payment" DROP CONSTRAINT "Payment_bookingId_fkey";

-- AlterTable
ALTER TABLE "Booking" ALTER COLUMN "type" TYPE "EventType" USING (
  CASE 
    WHEN "type" = 'day' THEN 'DAY_TOURISM'::"EventType"
    WHEN "type" = 'wedding' THEN 'DESTINATION_WEDDING'::"EventType"
    WHEN "type" = 'corporate' THEN 'CORPORATE_EVENT'::"EventType"
    WHEN "type" = 'party' THEN 'OTHER_EVENT'::"EventType"
    ELSE 'DAY_TOURISM'::"EventType"
  END
);

-- AlterTable
ALTER TABLE "Package" ALTER COLUMN "experienceType" TYPE "EventType" USING (
  CASE 
    WHEN "experienceType" = 'day' THEN 'DAY_TOURISM'::"EventType"
    WHEN "experienceType" = 'wedding' THEN 'DESTINATION_WEDDING'::"EventType"
    WHEN "experienceType" = 'corporate' THEN 'CORPORATE_EVENT'::"EventType"
    WHEN "experienceType" = 'party' THEN 'OTHER_EVENT'::"EventType"
    ELSE 'DAY_TOURISM'::"EventType"
  END
);

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
