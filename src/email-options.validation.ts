import { EmailError, EmailErrorCode } from "./core/index.ts";
import type { EmailModuleOptions } from "./email.types.ts";

function invalidConfiguration(message: string): never {
	throw new EmailError(message, {
		code: EmailErrorCode.INVALID_ARGUMENT,
		permanent: true,
	});
}

export function assertEmailModuleOptions(value: unknown): asserts value is EmailModuleOptions {
	if (value === null || typeof value !== "object" || Array.isArray(value)) {
		invalidConfiguration(
			"EmailModule configuration must be an object. Async configuration factories must return EmailModuleOptions.",
		);
	}
}

export function assertEmailAsyncRegistrationOptions(value: unknown): void {
	if (value === null || typeof value !== "object" || Array.isArray(value)) {
		invalidConfiguration("EmailModule.forRootAsync() options must be an object.");
	}

	const candidate = value as Record<string, unknown>;
	const strategies = ["useFactory", "useClass", "useExisting"].filter(
		(strategy) => candidate[strategy] !== undefined,
	);
	if (strategies.length !== 1) {
		invalidConfiguration(
			"EmailModule.forRootAsync() requires exactly one of useFactory, useClass, or useExisting.",
		);
	}
}
