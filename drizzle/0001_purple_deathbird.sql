CREATE TABLE `change_order_devices` (
	`id` text PRIMARY KEY NOT NULL,
	`change_order_id` text NOT NULL,
	`device_id` text NOT NULL,
	`version_id` text,
	`device_code_snapshot` text NOT NULL,
	`device_name_snapshot` text NOT NULL,
	`version_no_snapshot` text DEFAULT '—' NOT NULL,
	FOREIGN KEY (`change_order_id`) REFERENCES `change_orders`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`device_id`) REFERENCES `devices`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`version_id`) REFERENCES `device_versions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `change_order_devices_order_device_unique` ON `change_order_devices` (`change_order_id`,`device_id`);--> statement-breakpoint
CREATE TABLE `change_orders` (
	`id` text PRIMARY KEY NOT NULL,
	`order_no` text NOT NULL,
	`batch_no` text NOT NULL,
	`title` text NOT NULL,
	`reason` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`priority` text DEFAULT 'normal' NOT NULL,
	`planned_at` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`applicant_user_id` text NOT NULL,
	`reviewer_user_id` text,
	`review_comment` text,
	`submitted_at` text,
	`reviewed_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`applicant_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`reviewer_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `change_orders_order_no_unique` ON `change_orders` (`order_no`);