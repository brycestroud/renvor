CREATE TABLE `action_item_events` (
	`id` text PRIMARY KEY NOT NULL,
	`action_item_id` text NOT NULL,
	`event` text NOT NULL,
	`walk_id` text,
	`note` text,
	`notified` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`action_item_id`) REFERENCES `action_items`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`walk_id`) REFERENCES `walks`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `action_items` (
	`id` text PRIMARY KEY NOT NULL,
	`text` text NOT NULL,
	`owner_type` text NOT NULL,
	`superintendent_id` text,
	`project_id` text,
	`due_date` text,
	`priority` text DEFAULT 'medium' NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`source` text DEFAULT 'manual' NOT NULL,
	`source_summary` text,
	`origin_walk_id` text,
	`include_in_report` integer DEFAULT true NOT NULL,
	`closed_at` text,
	`deleted_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`superintendent_id`) REFERENCES `superintendents`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`origin_walk_id`) REFERENCES `walks`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `categories` (
	`id` text PRIMARY KEY NOT NULL,
	`key` text NOT NULL,
	`name` text NOT NULL,
	`weight` real,
	`is_gs_only` integer DEFAULT false NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `categories_key_unique` ON `categories` (`key`);--> statement-breakpoint
CREATE TABLE `checklist_items` (
	`id` text PRIMARY KEY NOT NULL,
	`category_id` text NOT NULL,
	`text` text NOT NULL,
	`frequency` text DEFAULT 'weekly' NOT NULL,
	`is_custom` integer DEFAULT false NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `people` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`title` text,
	`email` text NOT NULL,
	`role` text NOT NULL,
	`receives_full_report` integer DEFAULT false NOT NULL,
	`receives_exec_summary` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `projects` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`number` text,
	`pm_name` text,
	`pm_email` text,
	`address` text,
	`status` text DEFAULT 'active' NOT NULL,
	`procore_project_id` text,
	`procore_company_id` text,
	`deleted_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `report_snapshots` (
	`id` text PRIMARY KEY NOT NULL,
	`report_type` text NOT NULL,
	`week_start` text NOT NULL,
	`data` text NOT NULL,
	`pdf_path` text,
	`prepared_by` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `super_custom_fields` (
	`id` text PRIMARY KEY NOT NULL,
	`superintendent_id` text NOT NULL,
	`label` text NOT NULL,
	`value` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`superintendent_id`) REFERENCES `superintendents`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `superintendents` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`phone` text,
	`email` text,
	`years_experience` real,
	`home_project_id` text,
	`nccer_status` text DEFAULT 'not_started' NOT NULL,
	`notes` text,
	`procore_user_id` text,
	`active` integer DEFAULT true NOT NULL,
	`deleted_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`home_project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `walk_category_notes` (
	`id` text PRIMARY KEY NOT NULL,
	`walk_id` text NOT NULL,
	`category_id` text NOT NULL,
	`notes` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`walk_id`) REFERENCES `walks`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `walk_item_scores` (
	`id` text PRIMARY KEY NOT NULL,
	`walk_id` text NOT NULL,
	`checklist_item_id` text NOT NULL,
	`item_text_snapshot` text NOT NULL,
	`score` integer,
	`is_na` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`walk_id`) REFERENCES `walks`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`checklist_item_id`) REFERENCES `checklist_items`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `walks` (
	`id` text PRIMARY KEY NOT NULL,
	`date` text NOT NULL,
	`superintendent_id` text NOT NULL,
	`project_id` text NOT NULL,
	`pm_name_snapshot` text,
	`visit_type` text NOT NULL,
	`overall_notes` text,
	`followup_notes` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`submitted_at` text,
	`last_edited_at` text,
	`deleted_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`superintendent_id`) REFERENCES `superintendents`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action
);
