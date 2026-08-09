import { EmailModule, EmailService } from "../../src/index.ts";
import { MemoryEmailTransport } from "../../src/testing/index.ts";
import { Module } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { describe, expect, it } from "vitest";

describe("EmailModule application context", () => {
	it("renders, delivers, and closes through Nest lifecycle", async () => {
		const transport = new MemoryEmailTransport();

		@Module({
			imports: [
				EmailModule.forRoot({
					transport,
					renderer: {
						name: "e2e-renderer",
						render: (template) => ({ text: `Welcome ${String(template)}` }),
					},
					defaults: { from: "sender@example.com" },
				}),
			],
		})
		class AppModule {}

		const app = await NestFactory.createApplicationContext(AppModule, {
			logger: false,
		});
		const email = app.get(EmailService);

		await email.send({
			to: "person@example.com",
			subject: "Welcome",
			template: "Kauan",
		});

		expect(transport.messages).toHaveLength(1);
		expect(transport.messages[0]).toMatchObject({
			from: "sender@example.com",
			to: ["person@example.com"],
			subject: "Welcome",
			text: "Welcome Kauan",
		});

		await app.close();
		await expect(transport.send(transport.messages[0]!)).rejects.toThrow("closed");
	});
});
