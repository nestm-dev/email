import { Buffer } from "node:buffer";

import {
	EmailError,
	EmailErrorCode,
	emailAddressValue,
	formatEmailAddress,
	normalizeEmailHeaders,
	type EmailAddress,
	type EmailAttachment,
	type EmailResolvedMessage,
	type EmailSendResult,
	type EmailTransport,
} from "../../core/index.ts";

export interface NodemailerEmailAttachment {
	filename: string;
	content: string | Buffer;
	contentType?: string;
	cid?: string;
	contentDisposition?: "attachment" | "inline";
}

export interface NodemailerEmailMessageBase {
	from: string;
	to: string[];
	cc?: string[];
	bcc?: string[];
	replyTo?: string[];
	subject: string;
	headers?: Record<string, string>;
	attachments?: NodemailerEmailAttachment[];
}

export type NodemailerEmailMessage = NodemailerEmailMessageBase &
	(
		| {
				html: string;
				text?: string;
		  }
		| {
				text: string;
				html?: string;
		  }
	);

export interface NodemailerResultAddress {
	address: string;
	name?: string;
}

export type NodemailerResultRecipient = string | NodemailerResultAddress;

export interface NodemailerSentMessageInfo {
	messageId: string;
	accepted?: NodemailerResultRecipient[];
	rejected?: NodemailerResultRecipient[];
	response?: string;
}

/** The minimal, package-owned surface required from a Nodemailer transporter. */
export interface NodemailerTransporter {
	sendMail(
		message: NodemailerEmailMessage,
	): NodemailerSentMessageInfo | PromiseLike<NodemailerSentMessageInfo>;
	verify?(): unknown;
	close?(): unknown;
}

export interface NodemailerEmailTransportOptions {
	/** Close the wrapped transporter when EmailService shuts down. Defaults to false. */
	readonly closeTransporter?: boolean;
}

function invalidConfiguration(message: string): never {
	throw new EmailError(message, {
		code: EmailErrorCode.INVALID_ARGUMENT,
		operation: "send",
		transport: "nodemailer",
		permanent: true,
	});
}

function mapAddresses(addresses: readonly EmailAddress[]): string[] {
	return addresses.map((address) => formatEmailAddress(address));
}

function mapAttachment(attachment: EmailAttachment): NodemailerEmailAttachment {
	return {
		filename: attachment.filename,
		content:
			typeof attachment.content === "string" ? attachment.content : Buffer.from(attachment.content),
		...(attachment.contentType !== undefined && {
			contentType: attachment.contentType,
		}),
		...(attachment.contentId !== undefined && { cid: attachment.contentId }),
		...(attachment.disposition !== undefined && {
			contentDisposition: attachment.disposition,
		}),
	};
}

function mapMessage(message: EmailResolvedMessage): NodemailerEmailMessage {
	const headers = normalizeEmailHeaders(undefined, message.headers);
	const base: NodemailerEmailMessageBase = {
		from: formatEmailAddress(message.from),
		to: mapAddresses(message.to),
		...(message.cc !== undefined && { cc: mapAddresses(message.cc) }),
		...(message.bcc !== undefined && { bcc: mapAddresses(message.bcc) }),
		...(message.replyTo !== undefined && {
			replyTo: mapAddresses(message.replyTo),
		}),
		subject: message.subject,
		...(headers !== undefined && {
			headers: { ...headers },
		}),
		...(message.attachments !== undefined && {
			attachments: message.attachments.map(mapAttachment),
		}),
	};

	if (message.html !== undefined) {
		return {
			...base,
			html: message.html,
			...(message.text !== undefined && { text: message.text }),
		};
	}
	if (message.text !== undefined) {
		return { ...base, text: message.text };
	}
	return invalidConfiguration("Nodemailer requires an email message containing html or text.");
}

function mapResultRecipient(recipient: NodemailerResultRecipient): string {
	return emailAddressValue(recipient);
}

export class NodemailerEmailTransport implements EmailTransport {
	readonly name = "nodemailer";

	readonly #transporter: NodemailerTransporter;
	readonly #closeTransporter: boolean;

	constructor(transporter: NodemailerTransporter, options: NodemailerEmailTransportOptions = {}) {
		if (
			transporter === null ||
			typeof transporter !== "object" ||
			typeof transporter.sendMail !== "function"
		) {
			invalidConfiguration(
				"NodemailerEmailTransport requires a transporter with a sendMail() method.",
			);
		}
		if (options.closeTransporter !== undefined && typeof options.closeTransporter !== "boolean") {
			invalidConfiguration("closeTransporter must be a boolean.");
		}
		this.#transporter = transporter;
		this.#closeTransporter = options.closeTransporter === true;
	}

	async send(message: EmailResolvedMessage): Promise<EmailSendResult> {
		const info = await this.#transporter.sendMail(mapMessage(message));
		if (typeof info.messageId !== "string" || info.messageId.trim().length === 0) {
			throw new EmailError("Nodemailer returned a response without a message id.", {
				code: EmailErrorCode.DELIVERY_FAILED,
				operation: "send",
				transport: this.name,
			});
		}
		return Object.freeze({
			messageId: info.messageId,
			transport: this.name,
			...(info.accepted !== undefined && {
				accepted: Object.freeze(info.accepted.map(mapResultRecipient)),
			}),
			...(info.rejected !== undefined && {
				rejected: Object.freeze(info.rejected.map(mapResultRecipient)),
			}),
			...(typeof info.response === "string" && { response: info.response }),
		});
	}

	async verify(): Promise<void> {
		await this.#transporter.verify?.();
	}

	async close(): Promise<void> {
		if (this.#closeTransporter) {
			await this.#transporter.close?.();
		}
	}
}

export function createNodemailerEmailTransport(
	transporter: NodemailerTransporter,
	options: NodemailerEmailTransportOptions = {},
): NodemailerEmailTransport {
	return new NodemailerEmailTransport(transporter, options);
}
