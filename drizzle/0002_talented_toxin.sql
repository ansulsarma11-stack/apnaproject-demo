CREATE TABLE `cartItems` (
	`id` int AUTO_INCREMENT NOT NULL,
	`cartId` int NOT NULL,
	`productSlug` varchar(120) NOT NULL,
	`configurationJson` json NOT NULL,
	`preparationNote` varchar(240),
	`quantity` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `cartItems_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `carts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`cartKey` varchar(128) NOT NULL,
	`userId` int,
	`storeId` int NOT NULL,
	`promotionCode` varchar(48),
	`expiresAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `carts_id` PRIMARY KEY(`id`),
	CONSTRAINT `carts_cartKey_unique` UNIQUE(`cartKey`)
);
--> statement-breakpoint
CREATE TABLE `productOptionGroups` (
	`id` int AUTO_INCREMENT NOT NULL,
	`productId` int NOT NULL,
	`key` varchar(64) NOT NULL,
	`label` varchar(120) NOT NULL,
	`minSelections` int NOT NULL DEFAULT 0,
	`maxSelections` int NOT NULL DEFAULT 1,
	`displayOrder` int NOT NULL DEFAULT 0,
	`isRequired` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `productOptionGroups_id` PRIMARY KEY(`id`),
	CONSTRAINT `option_groups_product_key_unique` UNIQUE(`productId`,`key`)
);
--> statement-breakpoint
CREATE TABLE `productOptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`optionGroupId` int NOT NULL,
	`slug` varchar(96) NOT NULL,
	`label` varchar(120) NOT NULL,
	`priceDeltaCents` int NOT NULL DEFAULT 0,
	`isAvailable` boolean NOT NULL DEFAULT true,
	`displayOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `productOptions_id` PRIMARY KEY(`id`),
	CONSTRAINT `options_group_slug_unique` UNIQUE(`optionGroupId`,`slug`)
);
