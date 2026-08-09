import {
	InjectEmailRenderer,
	InjectEmailTransport,
	EmailErrorCode,
	EmailModule,
	EmailService,
	EMAIL_MODULE_OPTIONS,
	EMAIL_RENDERER,
	EMAIL_TRANSPORT,
	type EmailModuleOptions,
	type EmailOptionsFactory,
	type EmailForRootAsyncOptions,
	type EmailRenderer,
	type EmailTransport,
} from "../../src/index.ts";
import { Injectable, Module } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { describe, expect, it } from "vitest";

const transport: EmailTransport = {
	name: "module-test",
	send: () => ({ messageId: "message-1", transport: "module-test" }),
};

const renderer: EmailRenderer = {
	name: "module-renderer",
	render: () => ({ text: "rendered" }),
};

@Injectable()
class InjectedConsumer {
	constructor(
		@InjectEmailTransport() readonly transport: EmailTransport,
		@InjectEmailRenderer() readonly renderer: EmailRenderer | null,
		readonly email: EmailService,
	) {}
}

const FROM_TOKEN = Symbol("FROM_TOKEN");

@Module({
	providers: [{ provide: FROM_TOKEN, useValue: "factory@example.com" }],
	exports: [FROM_TOKEN],
})
class FactoryDependencyModule {}

@Injectable()
class ClassOptionsFactory implements EmailOptionsFactory {
	createEmailOptions(): EmailModuleOptions {
		return { transport, renderer };
	}
}

@Injectable()
class ExistingOptionsFactory implements EmailOptionsFactory {
	createEmailOptions(): EmailModuleOptions {
		return { transport, defaults: { from: "existing@example.com" } };
	}
}

@Module({
	providers: [ExistingOptionsFactory],
	exports: [ExistingOptionsFactory],
})
class ExistingOptionsModule {}

describe("EmailModule", () => {
	it("registers and exports the configured providers", async () => {
		const testingModule = await Test.createTestingModule({
			imports: [
				EmailModule.forRoot({
					transport,
					renderer,
					defaults: { from: "sender@example.com" },
					isGlobal: false,
				}),
			],
			providers: [InjectedConsumer],
		}).compile();

		const consumer = testingModule.get(InjectedConsumer);
		const options = testingModule.get<EmailModuleOptions>(EMAIL_MODULE_OPTIONS);

		expect(consumer.transport).toBe(transport);
		expect(consumer.renderer).toBe(renderer);
		expect(consumer.email.transportName).toBe("module-test");
		expect(testingModule.get(EMAIL_TRANSPORT)).toBe(transport);
		expect(testingModule.get(EMAIL_RENDERER)).toBe(renderer);
		expect(options).toEqual({
			transport,
			renderer,
			defaults: { from: "sender@example.com" },
		});
		expect("isGlobal" in options).toBe(false);

		await testingModule.close();
	});

	it("provides a deterministic null renderer", async () => {
		const testingModule = await Test.createTestingModule({
			imports: [EmailModule.forRoot({ transport, isGlobal: false })],
		}).compile();

		expect(testingModule.get(EMAIL_RENDERER)).toBeNull();
		await testingModule.close();
	});

	it("supports forRootAsync useFactory with injected dependencies", async () => {
		const testingModule = await Test.createTestingModule({
			imports: [
				EmailModule.forRootAsync({
					imports: [FactoryDependencyModule],
					inject: [FROM_TOKEN],
					useFactory: (from: string) => ({
						transport,
						defaults: { from },
					}),
					isGlobal: false,
				}),
			],
		}).compile();

		const email = testingModule.get(EmailService);
		await expect(
			email.send({
				to: "person@example.com",
				subject: "Hello",
				text: "Hello",
			}),
		).resolves.toMatchObject({ messageId: "message-1" });
		await testingModule.close();
	});

	it("supports forRootAsync useClass", async () => {
		const testingModule = await Test.createTestingModule({
			imports: [
				EmailModule.forRootAsync({
					useClass: ClassOptionsFactory,
					isGlobal: false,
				}),
			],
		}).compile();

		expect(testingModule.get(EMAIL_RENDERER)).toBe(renderer);
		await testingModule.close();
	});

	it("supports forRootAsync useExisting", async () => {
		const testingModule = await Test.createTestingModule({
			imports: [
				EmailModule.forRootAsync({
					imports: [ExistingOptionsModule],
					useExisting: ExistingOptionsFactory,
					isGlobal: false,
				}),
			],
		}).compile();

		const options = testingModule.get<EmailModuleOptions>(EMAIL_MODULE_OPTIONS);
		expect(options.defaults?.from).toBe("existing@example.com");
		await testingModule.close();
	});

	it("rejects a null async configuration result with a library error", async () => {
		await expect(
			Test.createTestingModule({
				imports: [
					EmailModule.forRootAsync({
						useFactory: () => null as unknown as EmailModuleOptions,
						isGlobal: false,
					}),
				],
			}).compile(),
		).rejects.toMatchObject({ code: EmailErrorCode.INVALID_ARGUMENT });
	});

	it("rejects missing or competing async strategies at runtime", () => {
		expect(() => EmailModule.forRootAsync({} as EmailForRootAsyncOptions)).toThrowError(
			expect.objectContaining({ code: EmailErrorCode.INVALID_ARGUMENT }),
		);
		expect(() =>
			EmailModule.forRootAsync({
				useFactory: () => ({ transport }),
				useClass: ClassOptionsFactory,
			} as unknown as EmailForRootAsyncOptions),
		).toThrowError(expect.objectContaining({ code: EmailErrorCode.INVALID_ARGUMENT }));
	});

	it("is global by default and can be made local", () => {
		expect(EmailModule.forRoot({ transport }).global).toBe(true);
		expect(EmailModule.forRoot({ transport, isGlobal: false }).global).toBe(false);
	});
});
