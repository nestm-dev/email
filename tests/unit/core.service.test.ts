import {
	EmailError,
	EmailErrorCode,
	EmailService,
	type EmailRenderer,
	type EmailResolvedMessage,
	type EmailSendResult,
	type EmailTransport,
} from "../../src/core/index.ts";
import { describe, expect, it } from "vitest";

function successfulResult(transport: string): EmailSendResult {
	return { messageId: "message-1", transport };
}

describe("EmailService", () => {
	it("merges defaults and sends normalized direct content", async () => {
		let delivered: EmailResolvedMessage | undefined;
		const transport: EmailTransport = {
			name: "test",
			send(message) {
				delivered = message;
				return successfulResult(this.name);
			},
		};
		const service = new EmailService({
			transport,
			defaults: {
				from: { address: "sender@example.com", name: "Sender" },
				replyTo: "default-reply@example.com",
				headers: { "X-Default": "yes", "X-Replace": "old" },
			},
		});

		const result = await service.send({
			to: ["one@example.com", { address: "two@example.com", name: "Two" }],
			replyTo: "reply@example.com",
			subject: "Welcome",
			html: "<strong>Hello</strong>",
			text: "Hello",
			headers: { "x-replace": "new" },
			attachments: [{ filename: "hello.txt", content: new Uint8Array([1, 2, 3]) }],
		});

		expect(result).toEqual({ messageId: "message-1", transport: "test" });
		expect(delivered).toEqual({
			from: { address: "sender@example.com", name: "Sender" },
			to: ["one@example.com", { address: "two@example.com", name: "Two" }],
			replyTo: ["reply@example.com"],
			subject: "Welcome",
			html: "<strong>Hello</strong>",
			text: "Hello",
			headers: { "X-Default": "yes", "x-replace": "new" },
			attachments: [{ filename: "hello.txt", content: new Uint8Array([1, 2, 3]) }],
		});
	});

	it("validates and snapshots defaults during construction", async () => {
		let delivered: EmailResolvedMessage | undefined;
		const transport: EmailTransport = {
			name: "test",
			send(message) {
				delivered = message;
				return successfulResult(this.name);
			},
		};
		const from = { address: "sender@example.com", name: "Sender" };
		const replyTo = ["reply@example.com"];
		const headers: Record<string, string> = { "X-Default": "before" };
		const service = new EmailService({
			transport,
			defaults: { from, replyTo, headers },
		});

		from.address = "changed@example.com";
		from.name = "Changed";
		replyTo[0] = "changed-reply@example.com";
		headers["X-Default"] = "after";
		headers.Bcc = "hidden@example.com";

		await service.send({
			to: "person@example.com",
			subject: "Snapshot",
			text: "Hello",
		});

		expect(delivered).toEqual({
			from: { address: "sender@example.com", name: "Sender" },
			to: ["person@example.com"],
			replyTo: ["reply@example.com"],
			subject: "Snapshot",
			text: "Hello",
			headers: { "X-Default": "before" },
		});
		expect(Object.isFrozen(delivered)).toBe(true);
		expect(Object.isFrozen(delivered?.from)).toBe(true);
		expect(Object.isFrozen(delivered?.replyTo)).toBe(true);
		expect(Object.isFrozen(delivered?.headers)).toBe(true);
	});

	it("rejects invalid defaults before the service can send", () => {
		const transport: EmailTransport = {
			name: "test",
			send: () => successfulResult("test"),
		};

		expect(() => new EmailService({ transport, defaults: { from: "not-an-address" } })).toThrow(
			/defaults\.from/,
		);
		expect(() => new EmailService({ transport, defaults: { replyTo: "not-an-address" } })).toThrow(
			/defaults\.replyTo/,
		);
		expect(
			() =>
				new EmailService({
					transport,
					defaults: { headers: { Bcc: "hidden@example.com" } },
				}),
		).toThrowError(EmailError);
	});

	it("renders templates before delivery", async () => {
		const calls: string[] = [];
		const renderer: EmailRenderer = {
			name: "template",
			render(template, context) {
				calls.push("render");
				const subject: string = context.subject;
				expect(template).toEqual({ name: "Kauan" });
				expect(subject).toBe("Hello");
				expect(context.from).toBe("sender@example.com");
				expect(context.to).toEqual(["person@example.com"]);
				return { html: "<p>Hello Kauan</p>", text: "Hello Kauan" };
			},
		};
		const transport: EmailTransport = {
			name: "test",
			send(message) {
				calls.push("send");
				expect(message.html).toBe("<p>Hello Kauan</p>");
				return successfulResult(this.name);
			},
		};
		const service = new EmailService({ transport, renderer });

		await service.send({
			from: "sender@example.com",
			to: "person@example.com",
			subject: "Hello",
			template: { name: "Kauan" },
		});

		expect(calls).toEqual(["render", "send"]);
	});

	it("fails clearly when a template has no renderer", async () => {
		const service = new EmailService({
			transport: {
				name: "test",
				send: () => successfulResult("test"),
			},
		});

		await expect(
			service.send({
				from: "sender@example.com",
				to: "person@example.com",
				subject: "Hello",
				template: { name: "Kauan" },
			}),
		).rejects.toMatchObject({
			code: EmailErrorCode.NOT_CONFIGURED,
			operation: "render",
		});
	});

	it("classifies invalid renderer output as a render failure", async () => {
		const service = new EmailService({
			transport: { name: "test", send: () => successfulResult("test") },
			renderer: {
				name: "invalid-output",
				render: () => ({}) as never,
			},
		});

		await expect(
			service.send({
				from: "sender@example.com",
				to: "person@example.com",
				subject: "Hello",
				template: {},
			}),
		).rejects.toMatchObject({
			code: EmailErrorCode.RENDER_FAILED,
			operation: "render",
			renderer: "invalid-output",
			permanent: true,
			cause: expect.objectContaining({ code: EmailErrorCode.INVALID_ARGUMENT }),
		});
	});

	it("normalizes renderer and transport failures", async () => {
		const rendererFailure = new EmailService({
			transport: { name: "test", send: () => successfulResult("test") },
			renderer: {
				name: "broken",
				render: () => {
					throw new Error("render exploded");
				},
			},
		});
		await expect(
			rendererFailure.send({
				from: "sender@example.com",
				to: "person@example.com",
				subject: "Hello",
				template: {},
			}),
		).rejects.toMatchObject({
			code: EmailErrorCode.RENDER_FAILED,
			renderer: "broken",
		});

		const transportFailure = new EmailService({
			transport: {
				name: "broken",
				send: () => {
					throw new Error("delivery exploded");
				},
			},
		});
		await expect(
			transportFailure.send({
				from: "sender@example.com",
				to: "person@example.com",
				subject: "Hello",
				text: "Hello",
			}),
		).rejects.toMatchObject({
			code: EmailErrorCode.DELIVERY_FAILED,
			transport: "broken",
		});
	});

	it("rejects header injection and invalid content before delivery", async () => {
		let sends = 0;
		const service = new EmailService({
			transport: {
				name: "test",
				send: () => {
					sends += 1;
					return successfulResult("test");
				},
			},
		});

		await expect(
			service.send({
				from: "sender@example.com\r\nBcc: victim@example.com",
				to: "person@example.com",
				subject: "Hello",
				text: "Hello",
			}),
		).rejects.toBeInstanceOf(EmailError);
		await expect(
			service.send({
				from: "sender@example.com",
				to: "person@example.com",
				subject: "Hello",
				html: "",
			}),
		).rejects.toMatchObject({ code: EmailErrorCode.INVALID_ARGUMENT });
		await expect(
			service.send({
				from: "sender@example.com",
				to: "person@example.com",
				subject: "Hello",
				text: "Hello",
				headers: { Bcc: "hidden@example.com" },
			}),
		).rejects.toMatchObject({ code: EmailErrorCode.INVALID_ARGUMENT });
		await expect(
			service.send({
				from: "sender@example.com",
				to: "person@example.com, hidden@example.com",
				subject: "Hello",
				text: "Hello",
			}),
		).rejects.toMatchObject({ code: EmailErrorCode.INVALID_ARGUMENT });
		expect(sends).toBe(0);
	});

	it("verifies and closes the transport exactly once", async () => {
		let verifies = 0;
		let closes = 0;
		const service = new EmailService({
			transport: {
				name: "test",
				send: () => successfulResult("test"),
				verify: () => {
					verifies += 1;
				},
				close: () => {
					closes += 1;
				},
			},
		});

		await service.verify();
		await service.close();
		await service.onApplicationShutdown();

		expect(verifies).toBe(1);
		expect(closes).toBe(1);
		await expect(
			service.send({
				from: "sender@example.com",
				to: "person@example.com",
				subject: "Hello",
				text: "Hello",
			}),
		).rejects.toMatchObject({ code: EmailErrorCode.CLOSED });
	});

	it("shares one in-flight close operation with every caller", async () => {
		let closes = 0;
		let releaseClose!: () => void;
		const closeGate = new Promise<void>((resolve) => {
			releaseClose = resolve;
		});
		const service = new EmailService({
			transport: {
				name: "slow-close",
				send: () => successfulResult("slow-close"),
				close: async () => {
					closes += 1;
					await closeGate;
				},
			},
		});

		const first = service.close();
		const second = service.close();
		const shutdown = service.onApplicationShutdown();
		expect(second).toBe(first);
		expect(shutdown).toBe(first);

		let settled = false;
		void second.then(() => {
			settled = true;
		});
		await Promise.resolve();
		expect(closes).toBe(1);
		expect(settled).toBe(false);

		releaseClose();
		await first;
		expect(settled).toBe(true);
		expect(closes).toBe(1);
	});

	it("retains a failed close outcome without retrying", async () => {
		let attempts = 0;
		const service = new EmailService({
			transport: {
				name: "failed-close",
				send: () => successfulResult("failed-close"),
				close: () => {
					attempts += 1;
					throw new Error("cleanup failed");
				},
			},
		});

		const first = service.close();
		expect(service.close()).toBe(first);
		await expect(first).rejects.toMatchObject({
			code: EmailErrorCode.DELIVERY_FAILED,
			operation: "close",
			transport: "failed-close",
			message: "cleanup failed",
		});

		const later = service.onApplicationShutdown();
		expect(later).toBe(first);
		await expect(later).rejects.toMatchObject({ operation: "close" });
		expect(attempts).toBe(1);
	});
});
