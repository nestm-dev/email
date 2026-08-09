import { Buffer } from "node:buffer";
import nodemailer from "nodemailer";
import { describe, expect, it } from "vitest";

import { EmailErrorCode, EmailService, type EmailResolvedMessage } from "../../src/core/index.ts";
import {
	createNodemailerEmailTransport,
	type NodemailerEmailMessage,
} from "../../src/transports/nodemailer/index.ts";

const message: EmailResolvedMessage = {
	from: "sender@example.com",
	to: [{ address: "person@example.com", name: "Person" }],
	subject: "Welcome",
	text: "Hello",
	attachments: [
		{
			filename: "inline.png",
			content: new Uint8Array([4, 5, 6]),
			contentType: "image/png",
			contentId: "logo",
			disposition: "inline",
		},
	],
};

describe("NodemailerEmailTransport", () => {
	it("maps messages and normalizes Nodemailer results", async () => {
		let request: NodemailerEmailMessage | undefined;
		let verifies = 0;
		let closes = 0;
		const transport = createNodemailerEmailTransport(
			{
				sendMail: (input) => {
					request = input;
					return {
						messageId: "smtp-1",
						accepted: ["person@example.com"],
						rejected: [{ address: "bad@example.com", name: "Bad" }],
						response: "250 queued",
					};
				},
				verify: () => {
					verifies += 1;
					return true;
				},
				close: () => {
					closes += 1;
				},
			},
			{ closeTransporter: true },
		);

		await transport.verify();
		await expect(transport.send(message)).resolves.toEqual({
			messageId: "smtp-1",
			transport: "nodemailer",
			accepted: ["person@example.com"],
			rejected: ["bad@example.com"],
			response: "250 queued",
		});
		await transport.close();

		expect(verifies).toBe(1);
		expect(closes).toBe(1);
		expect(request).toEqual({
			from: "sender@example.com",
			to: ['"Person" <person@example.com>'],
			subject: "Welcome",
			text: "Hello",
			attachments: [
				{
					filename: "inline.png",
					content: Buffer.from([4, 5, 6]),
					contentType: "image/png",
					cid: "logo",
					contentDisposition: "inline",
				},
			],
		});
	});

	it("does not close an application-owned transporter by default", async () => {
		let closes = 0;
		const transport = createNodemailerEmailTransport({
			sendMail: () => ({ messageId: "smtp-1" }),
			close: () => {
				closes += 1;
			},
		});

		await transport.close();
		expect(closes).toBe(0);
	});

	it("blocks recipient injection before a real Nodemailer transport", async () => {
		const adapter = createNodemailerEmailTransport(
			nodemailer.createTransport({ jsonTransport: true }),
		);
		await expect(
			adapter.send({ ...message, headers: { Bcc: "attacker@example.com" } }),
		).rejects.toMatchObject({ code: EmailErrorCode.INVALID_ARGUMENT });
		const email = new EmailService({
			transport: adapter,
			defaults: { from: "sender@example.com" },
		});

		await expect(
			email.send({
				to: "victim@example.com",
				subject: "Safe",
				text: "Hello",
			}),
		).resolves.toMatchObject({ transport: "nodemailer" });
		await expect(
			email.send({
				to: "victim@example.com",
				subject: "Reserved header",
				text: "Hello",
				headers: { Bcc: "attacker@example.com" },
			}),
		).rejects.toMatchObject({ code: EmailErrorCode.INVALID_ARGUMENT });
		await expect(
			email.send({
				to: "victim@example.com, attacker@example.com",
				subject: "Address list",
				text: "Hello",
			}),
		).rejects.toMatchObject({ code: EmailErrorCode.INVALID_ARGUMENT });
	});
});
