import type { DynamicModule } from "@nestjs/common";
import type { EmailDefaults, EmailRenderer } from "../core/index.ts";
import { EmailModule } from "../email.module.ts";
import {
	MemoryEmailTransport,
	type MemoryEmailTransportOptions,
} from "./memory-email.transport.ts";

export interface EmailTestingModuleOptions {
	readonly transport?: MemoryEmailTransport;
	readonly transportOptions?: MemoryEmailTransportOptions;
	readonly renderer?: EmailRenderer;
	readonly defaults?: EmailDefaults;
	/** Testing modules are local by default to prevent cross-test leakage. */
	readonly isGlobal?: boolean;
}

export function createEmailTestingModule(options: EmailTestingModuleOptions = {}): DynamicModule {
	return EmailModule.forRoot({
		transport: options.transport ?? new MemoryEmailTransport(options.transportOptions),
		...(options.renderer !== undefined && { renderer: options.renderer }),
		...(options.defaults !== undefined && { defaults: options.defaults }),
		isGlobal: options.isGlobal ?? false,
	});
}
