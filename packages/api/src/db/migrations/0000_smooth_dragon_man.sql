CREATE TABLE IF NOT EXISTS "contacts" (
	"phone" text PRIMARY KEY NOT NULL,
	"first_seen_at" timestamp DEFAULT now() NOT NULL,
	"last_seen_at" timestamp DEFAULT now() NOT NULL
);
