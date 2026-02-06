-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'MEMBER');
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'ISSUED', 'SENT', 'VIEWED', 'PAID', 'VOID');
CREATE TYPE "ActorType" AS ENUM ('INTERNAL', 'CUSTOMER', 'SYSTEM');
CREATE TYPE "EventType" AS ENUM ('DRAFT_CREATED', 'DRAFT_UPDATED', 'INVOICE_ISSUED', 'VIEW_TOKEN_CREATED', 'DELIVERY_SENT', 'INVOICE_VIEWED', 'INVOICE_PAID', 'PDF_GENERATED');
CREATE TYPE "DeliveryChannel" AS ENUM ('EMAIL');

CREATE TABLE "tenants" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "users" (
  "id" TEXT PRIMARY KEY,
  "tenant_id" TEXT NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "email" TEXT NOT NULL,
  "password_hash" TEXT NOT NULL,
  "role" "UserRole" NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE("tenant_id", "email")
);

CREATE TABLE "customers" (
  "id" TEXT PRIMARY KEY,
  "tenant_id" TEXT NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "billing_address" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "invoices" (
  "id" TEXT PRIMARY KEY,
  "tenant_id" TEXT NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "customer_id" TEXT NOT NULL REFERENCES "customers"("id") ON DELETE RESTRICT,
  "invoice_number" TEXT NOT NULL,
  "currency" TEXT NOT NULL,
  "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
  "issued_at" TIMESTAMP(3),
  "due_date" TIMESTAMP(3) NOT NULL,
  "total_amount" DECIMAL(12,2) NOT NULL,
  "current_version_id" TEXT UNIQUE,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE("tenant_id", "invoice_number")
);

CREATE TABLE "invoice_versions" (
  "id" TEXT PRIMARY KEY,
  "invoice_id" TEXT NOT NULL REFERENCES "invoices"("id") ON DELETE CASCADE,
  "version_number" INTEGER NOT NULL,
  "snapshot_json" JSONB NOT NULL,
  "subtotal" DECIMAL(12,2) NOT NULL,
  "tax" DECIMAL(12,2) NOT NULL,
  "total" DECIMAL(12,2) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_id" TEXT NOT NULL,
  UNIQUE("invoice_id", "version_number")
);

ALTER TABLE "invoices" ADD CONSTRAINT "invoices_current_version_id_fkey" FOREIGN KEY ("current_version_id") REFERENCES "invoice_versions"("id") ON DELETE SET NULL;

CREATE TABLE "invoice_deliveries" (
  "id" TEXT PRIMARY KEY,
  "invoice_id" TEXT NOT NULL REFERENCES "invoices"("id") ON DELETE CASCADE,
  "channel" "DeliveryChannel" NOT NULL,
  "to_email" TEXT NOT NULL,
  "sent_at" TIMESTAMP(3) NOT NULL,
  "provider_message_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "invoice_view_tokens" (
  "id" TEXT PRIMARY KEY,
  "invoice_id" TEXT NOT NULL REFERENCES "invoices"("id") ON DELETE CASCADE,
  "token_hash" TEXT NOT NULL,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "used_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "invoice_events" (
  "id" TEXT PRIMARY KEY,
  "invoice_id" TEXT NOT NULL REFERENCES "invoices"("id") ON DELETE CASCADE,
  "actor_type" "ActorType" NOT NULL,
  "actor_id" TEXT,
  "event_type" "EventType" NOT NULL,
  "payload_json" JSONB NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
