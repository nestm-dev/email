import type { Provider } from "@nestjs/common";
import { EmailService, type EmailRenderer, type EmailTransport } from "./core/index.ts";
import { assertEmailModuleOptions } from "./email-options.validation.ts";
import { EMAIL_MODULE_OPTIONS, EMAIL_RENDERER, EMAIL_TRANSPORT } from "./email.tokens.ts";
import type { EmailModuleOptions } from "./email.types.ts";

const EMAIL_VALIDATED_MODULE_OPTIONS = Symbol("@nestm/email/validated-module-options");

export const emailProviders: readonly Provider[] = [
	{
		provide: EMAIL_VALIDATED_MODULE_OPTIONS,
		inject: [EMAIL_MODULE_OPTIONS],
		useFactory: (options: unknown): EmailModuleOptions => {
			assertEmailModuleOptions(options);
			return options;
		},
	},
	{
		provide: EMAIL_TRANSPORT,
		inject: [EMAIL_VALIDATED_MODULE_OPTIONS],
		useFactory: (options: EmailModuleOptions): EmailTransport => options.transport,
	},
	{
		provide: EMAIL_RENDERER,
		inject: [EMAIL_VALIDATED_MODULE_OPTIONS],
		useFactory: (options: EmailModuleOptions): EmailRenderer | null => options.renderer ?? null,
	},
	{
		provide: EmailService,
		inject: [EMAIL_TRANSPORT, EMAIL_RENDERER, EMAIL_VALIDATED_MODULE_OPTIONS],
		useFactory: (
			transport: EmailTransport,
			renderer: EmailRenderer | null,
			options: EmailModuleOptions,
		): EmailService =>
			new EmailService({
				transport,
				renderer,
				...(options.defaults !== undefined && { defaults: options.defaults }),
			}),
	},
];
