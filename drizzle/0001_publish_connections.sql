CREATE TYPE "public"."publish_provider" AS ENUM('soundcloud', 'youtube');--> statement-breakpoint
CREATE TYPE "public"."release_draft_status" AS ENUM('draft', 'exported', 'linked_out');--> statement-breakpoint
CREATE TABLE "publish_connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" text NOT NULL,
	"provider" "publish_provider" NOT NULL,
	"provider_account_id" text NOT NULL,
	"access_token_cipher" text NOT NULL,
	"access_token_expires" timestamp with time zone NOT NULL,
	"refresh_token_cipher" text,
	"scope" text,
	"connected_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_used_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "publish_connections" ADD CONSTRAINT "publish_connections_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "publish_connections_user_provider_active_uidx" ON "publish_connections" USING btree ("userId","provider") WHERE "revoked_at" IS NULL;
CREATE INDEX "publish_connections_user_idx" ON "publish_connections" USING btree ("userId");--> statement-breakpoint
CREATE TABLE "release_drafts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" text NOT NULL,
	"metadata_json" jsonb NOT NULL,
	"delivery_asset_id" uuid,
	"distributor" text NOT NULL,
	"status" "release_draft_status" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "release_drafts" ADD CONSTRAINT "release_drafts_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "release_drafts" ADD CONSTRAINT "release_drafts_delivery_asset_id_audio_assets_id_fk" FOREIGN KEY ("delivery_asset_id") REFERENCES "public"."audio_assets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "release_drafts_user_idx" ON "release_drafts" USING btree ("userId");
