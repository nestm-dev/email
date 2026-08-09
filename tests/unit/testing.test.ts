import { EmailService, EMAIL_TRANSPORT } from "../../src/index.ts";
import { createEmailTestingModule, MemoryEmailTransport } from "../../src/testing/index.ts";
import { Test } from "@nestjs/testing";
import { describe, expect, it } from "vitest";

describe("email testing utilities", () => {
	it("reports every envelope recipient as accepted", async () => {
		const transport = new MemoryEmailTransport();

		await expect(
			transport.send({
				from: "sender@example.com",
				to: ["to@example.com", { address: "named-to@example.com", name: "To" }],
				cc: ["cc@example.com"],
				bcc: [{ address: "bcc@example.com", name: "Bcc" }],
				subject: "Recipients",
				text: "Hello",
			}),
		).resolves.toMatchObject({
			accepted: ["to@example.com", "named-to@example.com", "cc@example.com", "bcc@example.com"],
		});
	});

	it("records isolated message snapshots", async () => {
		const bytes = new Uint8Array([1, 2]);
		const transport = new MemoryEmailTransport();
		const testingModule = await Test.createTestingModule({
			imports: [
				createEmailTestingModule({
					transport,
					defaults: { from: "sender@example.com" },
				}),
			],
		}).compile();
		const email = testingModule.get(EmailService);

		await email.send({
			to: "person@example.com",
			subject: "Hello",
			text: "Hello",
			attachments: [{ filename: "bytes.bin", content: bytes }],
		});
		bytes[0] = 9;

		expect(testingModule.get(EMAIL_TRANSPORT)).toBe(transport);
		expect(transport.messages[0]?.attachments?.[0]?.content).toEqual(new Uint8Array([1, 2]));
		transport.clear();
		expect(transport.messages).toHaveLength(0);
		await testingModule.close();
	});
});
