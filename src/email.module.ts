import { Module, type DynamicModule } from "@nestjs/common";
import { EmailService } from "./core/index.ts";
import {
	ConfigurableModuleClass,
	createGeneratedEmailAsyncModule,
	type EmailForRootAsyncOptions,
	type EmailForRootOptions,
} from "./email.module-definition.ts";
import {
	assertEmailAsyncRegistrationOptions,
	assertEmailModuleOptions,
} from "./email-options.validation.ts";
import { emailProviders } from "./email.providers.ts";
import { EMAIL_MODULE_OPTIONS, EMAIL_RENDERER, EMAIL_TRANSPORT } from "./email.tokens.ts";

@Module({
	providers: [...emailProviders],
	exports: [EMAIL_MODULE_OPTIONS, EMAIL_TRANSPORT, EMAIL_RENDERER, EmailService],
})
export class EmailModule extends ConfigurableModuleClass {
	static override forRoot(options: EmailForRootOptions): DynamicModule {
		assertEmailModuleOptions(options);
		return super.forRoot(options);
	}

	static forRootAsync(options: EmailForRootAsyncOptions): DynamicModule {
		assertEmailAsyncRegistrationOptions(options);
		return createGeneratedEmailAsyncModule(this, options);
	}
}
