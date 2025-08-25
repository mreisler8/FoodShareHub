
-- Migration: Add list reactions table
CREATE TABLE IF NOT EXISTS "list_reactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"list_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"reaction" varchar(20) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "list_reactions_list_id_user_id_unique" UNIQUE("list_id","user_id")
);

DO $$ BEGIN
 ALTER TABLE "list_reactions" ADD CONSTRAINT "list_reactions_list_id_restaurant_lists_id_fk" FOREIGN KEY ("list_id") REFERENCES "restaurant_lists"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "list_reactions" ADD CONSTRAINT "list_reactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
