import type { EmailResolvedMessage, EmailSendResult, EmailTransport } from "../core/index.ts";

export interface MemoryEmailTransportOptions {
	readonly name?: string;
	readonly createMessageId?: (message: EmailResolvedMessage, index: number) => string;
}

export class MemoryEmailTransport implements EmailTransport {
	readonly name: string;
	readonly #createMessageId: NonNullable<MemoryEmailTransportOptions["createMessageId"]>;
	readonly #messages: EmailResolvedMessage[] = [];
	#closed = false;

	constructor(options: MemoryEmailTransportOptions = {}) {
		this.name = options.name ?? "memory";
		this.#createMessageId = options.createMessageId ?? ((_, index) => `memory-${index + 1}`);
	}

	get messages(): readonly EmailResolvedMessage[] {
		return this.#messages;
	}

	async send(message: EmailResolvedMessage): Promise<EmailSendResult> {
		if (this.#closed) {
			throw new Error("MemoryEmailTransport is closed.");
		}
		const stored = structuredClone(message);
		this.#messages.push(stored);
		return {
			messageId: this.#createMessageId(stored, this.#messages.length - 1),
			transport: this.name,
			accepted: [...stored.to, ...(stored.cc ?? []), ...(stored.bcc ?? [])].map((address) =>
				typeof address === "string" ? address : address.address,
			),
		};
	}

	clear(): void {
		this.#messages.length = 0;
	}

	close(): void {
		this.#closed = true;
	}
}

export function createMemoryEmailTransport(
	options: MemoryEmailTransportOptions = {},
): MemoryEmailTransport {
	return new MemoryEmailTransport(options);
}
