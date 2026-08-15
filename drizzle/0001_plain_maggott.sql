CREATE TABLE `auditEvents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`actorUserId` int,
	`actorRole` varchar(32),
	`action` varchar(120) NOT NULL,
	`entityType` varchar(80) NOT NULL,
	`entityId` varchar(120) NOT NULL,
	`beforeJson` json,
	`afterJson` json,
	`reason` varchar(500),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `auditEvents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderId` int NOT NULL,
	`channel` enum('email','sms') NOT NULL,
	`recipient` varchar(320) NOT NULL,
	`template` varchar(80) NOT NULL,
	`status` enum('queued','sent','failed') NOT NULL DEFAULT 'queued',
	`providerReference` varchar(255),
	`failureReason` varchar(500),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `orderEvents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderId` int NOT NULL,
	`eventType` varchar(80) NOT NULL,
	`oldStatus` varchar(32),
	`newStatus` varchar(32),
	`actorType` enum('customer','staff','system') NOT NULL,
	`actorUserId` int,
	`metadataJson` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `orderEvents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `orderItems` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderId` int NOT NULL,
	`productId` varchar(120) NOT NULL,
	`productName` varchar(160) NOT NULL,
	`configurationJson` json NOT NULL,
	`preparationNote` varchar(240),
	`quantity` int NOT NULL,
	`unitPriceCents` int NOT NULL,
	`lineTotalCents` int NOT NULL,
	CONSTRAINT `orderItems_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`publicId` varchar(24) NOT NULL,
	`idempotencyKey` varchar(128) NOT NULL,
	`storeId` int NOT NULL,
	`customerId` int,
	`guestName` varchar(160),
	`guestEmail` varchar(320),
	`guestPhone` varchar(32),
	`fulfillmentMethod` enum('delivery','pickup') NOT NULL,
	`deliveryAddressJson` json,
	`status` enum('payment_pending','confirmed','preparing','ready','out for delivery','completed','cancelled') NOT NULL DEFAULT 'payment_pending',
	`estimateMinutes` int NOT NULL,
	`subtotalCents` int NOT NULL,
	`discountCents` int NOT NULL DEFAULT 0,
	`deliveryFeeCents` int NOT NULL DEFAULT 0,
	`taxCents` int NOT NULL DEFAULT 0,
	`totalCents` int NOT NULL,
	`promotionCode` varchar(48),
	`stripeCheckoutSessionId` varchar(255),
	`stripePaymentIntentId` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `orders_id` PRIMARY KEY(`id`),
	CONSTRAINT `orders_publicId_unique` UNIQUE(`publicId`),
	CONSTRAINT `orders_idempotencyKey_unique` UNIQUE(`idempotencyKey`)
);
--> statement-breakpoint
CREATE TABLE `payments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderId` int NOT NULL,
	`stripePaymentIntentId` varchar(255),
	`status` varchar(64) NOT NULL,
	`amountCents` int NOT NULL,
	`currency` varchar(12) NOT NULL DEFAULT 'usd',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `payments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `products` (
	`id` int AUTO_INCREMENT NOT NULL,
	`storeId` int NOT NULL,
	`slug` varchar(120) NOT NULL,
	`name` varchar(160) NOT NULL,
	`description` text,
	`category` enum('Pizzas','Sides','Drinks','Desserts') NOT NULL,
	`basePriceCents` int NOT NULL,
	`imageUrl` text,
	`isAvailable` boolean NOT NULL DEFAULT true,
	`optionConfigJson` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `products_id` PRIMARY KEY(`id`),
	CONSTRAINT `products_store_slug_unique` UNIQUE(`storeId`,`slug`)
);
--> statement-breakpoint
CREATE TABLE `promotions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`storeId` int NOT NULL,
	`code` varchar(48) NOT NULL,
	`type` enum('percentage','fixed') NOT NULL,
	`value` int NOT NULL,
	`minSubtotalCents` int NOT NULL DEFAULT 0,
	`isActive` boolean NOT NULL DEFAULT true,
	`startsAt` timestamp,
	`endsAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `promotions_id` PRIMARY KEY(`id`),
	CONSTRAINT `promotions_store_code_unique` UNIQUE(`storeId`,`code`)
);
--> statement-breakpoint
CREATE TABLE `refunds` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderId` int NOT NULL,
	`stripeRefundId` varchar(255),
	`amountCents` int NOT NULL,
	`reason` varchar(500) NOT NULL,
	`status` varchar(64) NOT NULL,
	`initiatedByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `refunds_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `stores` (
	`id` int AUTO_INCREMENT NOT NULL,
	`slug` varchar(100) NOT NULL,
	`name` varchar(160) NOT NULL,
	`address` text NOT NULL,
	`phone` varchar(32),
	`isOpen` boolean NOT NULL DEFAULT true,
	`pickupEnabled` boolean NOT NULL DEFAULT true,
	`deliveryEnabled` boolean NOT NULL DEFAULT true,
	`deliveryFeeCents` int NOT NULL DEFAULT 499,
	`taxRateBasisPoints` int NOT NULL DEFAULT 888,
	`hoursJson` json,
	`deliveryZonesJson` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `stores_id` PRIMARY KEY(`id`),
	CONSTRAINT `stores_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('user','staff','manager','support','admin') NOT NULL DEFAULT 'user';--> statement-breakpoint
ALTER TABLE `users` ADD `stripeCustomerId` varchar(255);