import { Buffer } from "node:buffer";
import { describe, expect, it } from "vitest";

import { EmailErrorCode, type EmailResolvedMessage } from "../../src/core/index.ts";
import {
	createResendEmailTransport,
	type ResendEmailRequest,
} from "../../src/transports/resend/index.ts";

const message: EmailResolvedMessage = {
	from: { address: "sender@example.com", name: "Sender" },
	to: ["one@example.com", { address: "two@example.com", name: "Two" }],
	cc: ["copy@example.com"],
	bcc: ["hidden@example.com"],
	replyTo: ["reply@example.com"],
	subject: "Welcome",
	html: "<p>Hello</p>",
	text: "Hello",
	headers: { "X-Trace": "trace-1" },
	attachments: [
		{
			filename: "hello.txt",
			content: new Uint8Array([1, 2, 3]),
			contentType: "text/plain",
			contentId: "hello",
			disposition: "inline",
		},
	],
};

describe("ResendEmailTransport", () => {
	it("maps provider-neutral messages to the Resend client", async () => {
		let request: ResendEmailRequest | undefined;
		const transport = createResendEmailTransport({
			emails: {
				send: (input) => {
					request = input;
					return { data: { id: "resend-1" }, error: null };
				},
			},
		});

		await expect(transport.send(message)).resolves.toEqual({
			messageId: "resend-1",
			transport: "resend",
		});
		expect(request).toEqual({
			from: '"Sender" <sender@example.com>',
			to: ["one@example.com", '"Two" <two@example.com>'],
			cc: ["copy@example.com"],
			bcc: ["hidden@example.com"],
			replyTo: ["reply@example.com"],
			subject: "Welcome",
			html: "<p>Hello</p>",
			text: "Hello",
			headers: { "X-Trace": "trace-1" },
			attachments: [
				{
					filename: "hello.txt",
					content: Buffer.from([1, 2, 3]),
					contentType: "text/plain",
					contentId: "hello",
				},
			],
		});
	});

	it("encodes string attachment content as UTF-8 bytes", async () => {
		let request: ResendEmailRequest | undefined;
		const transport = createResendEmailTransport({
			emails: {
				send: (input) => {
					request = input;
					return { data: { id: "resend-text" }, error: null };
				},
			},
		});

		await transport.send({
			...message,
			attachments: [
				{
					filename: "greeting.txt",
					content: "Olá, 👋",
					contentType: "text/plain; charset=utf-8",
				},
			],
		});

		expect(request?.attachments?.[0]?.content).toEqual(Buffer.from("Olá, 👋", "utf8"));
	});

	it("turns Resend error responses into EmailError", async () => {
		const providerError = { message: "domain is not verified", statusCode: 422 };
		const transport = createResendEmailTransport({
			emails: {
				send: () => ({ data: null, error: providerError }),
			},
		});

		await expect(transport.send(message)).rejects.toMatchObject({
			code: EmailErrorCode.DELIVERY_FAILED,
			message: "domain is not verified",
			transport: "resend",
			cause: providerError,
		});
	});

	it("rejects reserved routing headers on direct transport calls", async () => {
		const transport = createResendEmailTransport({
			emails: {
				send: () => ({ data: { id: "resend-1" }, error: null }),
			},
		});

		await expect(
			transport.send({ ...message, headers: { Bcc: "attacker@example.com" } }),
		).rejects.toMatchObject({ code: EmailErrorCode.INVALID_ARGUMENT });
	});
});
