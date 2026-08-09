import type { EmailDefaults, EmailRenderer, EmailTransport } from "./core/index.ts";

export interface EmailModuleOptions {
	readonly transport: EmailTransport;
	readonly renderer?: EmailRenderer;
	readonly defaults?: EmailDefaults;
}

export interface EmailModuleExtras {
	/** Makes EmailService and the configured integrations globally injectable. Defaults to true. */
	readonly isGlobal?: boolean;
}

export interface EmailOptionsFactory {
	createEmailOptions(): EmailModuleOptions | Promise<EmailModuleOptions>;
}

export function defineEmailConfig(options: EmailModuleOptions): EmailModuleOptions {
	return options;
}
