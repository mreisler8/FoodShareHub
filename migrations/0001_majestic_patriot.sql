CREATE TABLE "circle_invites" (
	"id" serial PRIMARY KEY NOT NULL,
	"circle_id" integer NOT NULL,
	"email_or_username" text NOT NULL,
	"inviter_id" integer NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "circle_shared_lists" (
	"id" serial PRIMARY KEY NOT NULL,
	"circle_id" integer NOT NULL,
	"list_id" integer NOT NULL,
	"shared_by_id" integer NOT NULL,
	"shared_at" timestamp DEFAULT now() NOT NULL,
	"can_edit" boolean DEFAULT false,
	"can_reshare" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE "list_item_comments" (
	"id" serial PRIMARY KEY NOT NULL,
	"item_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "saved_lists" (
	"id" serial PRIMARY KEY NOT NULL,
	"list_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"saved_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "circles" DROP CONSTRAINT "circles_creator_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "posts" ALTER COLUMN "visibility" SET DATA TYPE json;--> statement-breakpoint
ALTER TABLE "posts" ALTER COLUMN "images" SET DEFAULT '{}';--> statement-breakpoint
ALTER TABLE "restaurant_lists" ALTER COLUMN "visibility" SET DATA TYPE json;--> statement-breakpoint
ALTER TABLE "restaurant_lists" ALTER COLUMN "visibility" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "circle_members" ADD COLUMN "status" text DEFAULT 'active';--> statement-breakpoint
ALTER TABLE "circle_members" ADD COLUMN "approved_at" timestamp;--> statement-breakpoint
ALTER TABLE "circle_members" ADD COLUMN "approved_by" integer;--> statement-breakpoint
ALTER TABLE "circles" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "videos" text[] DEFAULT '{}';--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "image_tags" text[] DEFAULT '{}';--> statement-breakpoint
ALTER TABLE "restaurant_list_items" ADD COLUMN "price_assessment" text;--> statement-breakpoint
ALTER TABLE "restaurant_list_items" ADD COLUMN "rank" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "restaurant_list_items" ADD COLUMN "is_favorite" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "restaurant_list_items" ADD COLUMN "name" text NOT NULL;--> statement-breakpoint
ALTER TABLE "restaurant_list_items" ADD COLUMN "tags" text[];--> statement-breakpoint
ALTER TABLE "restaurant_list_items" ADD COLUMN "city" text;--> statement-breakpoint
ALTER TABLE "restaurant_list_items" ADD COLUMN "media_url" text;--> statement-breakpoint
ALTER TABLE "restaurant_lists" ADD COLUMN "type" text DEFAULT 'restaurant' NOT NULL;--> statement-breakpoint
ALTER TABLE "restaurant_lists" ADD COLUMN "audience" text DEFAULT 'profile' NOT NULL;--> statement-breakpoint
ALTER TABLE "restaurant_lists" ADD COLUMN "cover_image" text;--> statement-breakpoint
ALTER TABLE "user_followers" ADD COLUMN "status" text DEFAULT 'following';--> statement-breakpoint
ALTER TABLE "user_followers" ADD COLUMN "approved_at" timestamp;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "favorite_food" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "favorite_restaurant" text;--> statement-breakpoint
ALTER TABLE "circle_invites" ADD CONSTRAINT "circle_invites_circle_id_circles_id_fk" FOREIGN KEY ("circle_id") REFERENCES "public"."circles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "circle_invites" ADD CONSTRAINT "circle_invites_inviter_id_users_id_fk" FOREIGN KEY ("inviter_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "circle_shared_lists" ADD CONSTRAINT "circle_shared_lists_circle_id_circles_id_fk" FOREIGN KEY ("circle_id") REFERENCES "public"."circles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "circle_shared_lists" ADD CONSTRAINT "circle_shared_lists_list_id_restaurant_lists_id_fk" FOREIGN KEY ("list_id") REFERENCES "public"."restaurant_lists"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "circle_shared_lists" ADD CONSTRAINT "circle_shared_lists_shared_by_id_users_id_fk" FOREIGN KEY ("shared_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "list_item_comments" ADD CONSTRAINT "list_item_comments_item_id_restaurant_list_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."restaurant_list_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "list_item_comments" ADD CONSTRAINT "list_item_comments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_lists" ADD CONSTRAINT "saved_lists_list_id_restaurant_lists_id_fk" FOREIGN KEY ("list_id") REFERENCES "public"."restaurant_lists"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_lists" ADD CONSTRAINT "saved_lists_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "circle_members" ADD CONSTRAINT "circle_members_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "circles" ADD CONSTRAINT "circles_creator_id_users_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "circle_members_user_id_idx" ON "circle_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "circle_members_circle_id_idx" ON "circle_members" USING btree ("circle_id");--> statement-breakpoint
CREATE INDEX "circle_members_status_idx" ON "circle_members" USING btree ("status");--> statement-breakpoint
CREATE INDEX "circle_members_user_circle_idx" ON "circle_members" USING btree ("user_id","circle_id");--> statement-breakpoint
CREATE INDEX "circles_invite_code_idx" ON "circles" USING btree ("invite_code");--> statement-breakpoint
CREATE INDEX "circles_creator_id_idx" ON "circles" USING btree ("creator_id");--> statement-breakpoint
CREATE INDEX "circles_updated_at_idx" ON "circles" USING btree ("updated_at");--> statement-breakpoint
CREATE INDEX "circles_featured_idx" ON "circles" USING btree ("featured");--> statement-breakpoint
CREATE INDEX "restaurant_list_items_list_id_idx" ON "restaurant_list_items" USING btree ("list_id");--> statement-breakpoint
CREATE INDEX "restaurant_list_items_restaurant_id_idx" ON "restaurant_list_items" USING btree ("restaurant_id");--> statement-breakpoint
CREATE INDEX "restaurant_list_items_added_by_idx" ON "restaurant_list_items" USING btree ("added_by_id");--> statement-breakpoint
CREATE INDEX "restaurant_list_items_rank_idx" ON "restaurant_list_items" USING btree ("rank");--> statement-breakpoint
CREATE INDEX "restaurant_list_items_is_favorite_idx" ON "restaurant_list_items" USING btree ("is_favorite");