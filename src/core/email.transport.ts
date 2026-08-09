import type { EmailResolvedMessage, EmailSendResult } from "./email.types.ts";

export interface EmailTransport {
	readonly name: string;

	send(message: EmailResolvedMessage): EmailSendResult | Promise<EmailSendResult>;

	verify?(): void | Promise<void>;

	close?(): void | Promise<void>;
}
