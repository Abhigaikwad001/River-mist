/*
  Warnings:

  - A unique constraint covering the columns `[bookingId]` on the table `WeddingQuote` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "BookingResource" ADD COLUMN     "quantity" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "WeddingQuote" ADD COLUMN     "bookingId" INTEGER,
ADD COLUMN     "decorationRequirements" TEXT,
ADD COLUMN     "djMusicRequirements" TEXT,
ADD COLUMN     "eventType" "EventType" NOT NULL DEFAULT 'WEDDING',
ADD COLUMN     "foodRequirements" TEXT,
ADD COLUMN     "photographyRequirements" TEXT,
ADD COLUMN     "specialRequirements" TEXT,
ADD COLUMN     "venueRequirements" TEXT;

-- CreateTable
CREATE TABLE "QuoteItem" (
    "id" SERIAL NOT NULL,
    "quoteId" INTEGER NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,

    CONSTRAINT "QuoteItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WeddingQuote_bookingId_key" ON "WeddingQuote"("bookingId");

-- AddForeignKey
ALTER TABLE "WeddingQuote" ADD CONSTRAINT "WeddingQuote_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteItem" ADD CONSTRAINT "QuoteItem_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "WeddingQuote"("id") ON DELETE CASCADE ON UPDATE CASCADE;
