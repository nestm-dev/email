import { ConfigurableModuleBuilder, type DynamicModule } from "@nestjs/common";
import { EMAIL_MODULE_OPTIONS } from "./email.tokens.ts";
import type { EmailModuleExtras, EmailModuleOptions } from "./email.types.ts";

const {
	ConfigurableModuleClass: GeneratedConfigurableModuleClass,
	OPTIONS_TYPE,
	ASYNC_OPTIONS_TYPE,
} = new ConfigurableModuleBuilder<EmailModuleOptions>({
	alwaysTransient: true,
	optionsInjectionToken: EMAIL_MODULE_OPTIONS,
})
	.setClassMethodName("forRoot")
	.setFactoryMethodName("createEmailOptions")
	.setExtras<EmailModuleExtras>({ isGlobal: true }, (definition, extras) => ({
		...definition,
		global: extras.isGlobal !== false,
	}))
	.build();

export { ASYNC_OPTIONS_TYPE, OPTIONS_TYPE };

type EmailConfigurableModuleBase = {
	new (): InstanceType<typeof GeneratedConfigurableModuleClass>;
	forRoot: typeof GeneratedConfigurableModuleClass.forRoot;
};

/**
 * The runtime class still owns Nest's generated async implementation. Its raw
 * static async signature is hidden so EmailModule can expose the stricter
 * exactly-one strategy contract.
 */
export const ConfigurableModuleClass =
	GeneratedConfigurableModuleClass as EmailConfigurableModuleBase;

export type EmailForRootOptions = typeof OPTIONS_TYPE;

type GeneratedEmailForRootAsyncOptions = typeof ASYNC_OPTIONS_TYPE;
type EmailAsyncStrategy = "useFactory" | "useClass" | "useExisting";

type RequireExactlyOneAsyncStrategy<OPTIONS, STRATEGY extends keyof OPTIONS> = {
	[SELECTED in STRATEGY]-?: Omit<OPTIONS, STRATEGY> & {
		[KEY in SELECTED]-?: NonNullable<OPTIONS[KEY]>;
	} & { [KEY in Exclude<STRATEGY, SELECTED>]?: never };
}[STRATEGY];

/** Async registration options with exactly one Nest configuration strategy. */
export type EmailForRootAsyncOptions = RequireExactlyOneAsyncStrategy<
	GeneratedEmailForRootAsyncOptions,
	EmailAsyncStrategy
>;

/** @internal Delegates to Nest's generated implementation with EmailModule as `this`. */
export function createGeneratedEmailAsyncModule(
	module: typeof ConfigurableModuleClass,
	options: EmailForRootAsyncOptions,
): DynamicModule {
	return GeneratedConfigurableModuleClass.forRootAsync.call(
		module as typeof GeneratedConfigurableModuleClass,
		options,
	);
}
