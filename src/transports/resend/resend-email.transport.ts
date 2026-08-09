import { Buffer } from "node:buffer";

import {
	EmailError,
	EmailErrorCode,
	formatEmailAddress,
	normalizeEmailHeaders,
	type EmailAddress,
	type EmailAttachment,
	type EmailResolvedMessage,
	type EmailSendResult,
	type EmailTransport,
} from "../../core/index.ts";

export interface ResendEmailAttachment {
	filename: string;
	content: string | Buffer;
	contentType?: string;
	contentId?: string;
}

export interface ResendEmailRequestBase {
	from: string;
	to: string[];
	cc?: string[];
	bcc?: string[];
	replyTo?: string[];
	subject: string;
	headers?: Record<string, string>;
	attachments?: ResendEmailAttachment[];
}

export type ResendEmailRequest = ResendEmailRequestBase &
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

export interface ResendEmailResponseData {
	id: string;
}

export interface ResendErrorResponse {
	message?: string;
	name?: string;
	statusCode?: number | null;
}

export type ResendEmailResponse =
	| {
			data: ResendEmailResponseData;
			error: null;
	  }
	| {
			data: null;
			error: ResendErrorResponse;
	  };

export interface ResendEmailsClient {
	send(message: ResendEmailRequest): ResendEmailResponse | PromiseLike<ResendEmailResponse>;
}

/** The minimal, package-owned surface required from a Resend SDK client. */
export interface ResendClient {
	readonly emails: ResendEmailsClient;
}

function invalidConfiguration(message: string): never {
	throw new EmailError(message, {
		code: EmailErrorCode.INVALID_ARGUMENT,
		operation: "send",
		transport: "resend",
		permanent: true,
	});
}

function mapAddresses(addresses: readonly EmailAddress[]): string[] {
	return addresses.map((address) => formatEmailAddress(address));
}

function mapAttachment(attachment: EmailAttachment): ResendEmailAttachment {
	return {
		filename: attachment.filename,
		content:
			typeof attachment.content === "string"
				? Buffer.from(attachment.content, "utf8")
				: Buffer.from(attachment.content),
		...(attachment.contentType !== undefined && {
			contentType: attachment.contentType,
		}),
		...(attachment.contentId !== undefined && {
			contentId: attachment.contentId,
		}),
	};
}

function mapMessage(message: EmailResolvedMessage): ResendEmailRequest {
	const headers = normalizeEmailHeaders(undefined, message.headers);
	const base: ResendEmailRequestBase = {
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
	return invalidConfiguration("Resend requires an email message containing html or text.");
}

function responseErrorMessage(error: ResendErrorResponse): string {
	return typeof error.message === "string" && error.message.trim().length > 0
		? error.message
		: "Resend failed to send the email.";
}

export class ResendEmailTransport implements EmailTransport {
	readonly name = "resend";

	readonly #client: ResendClient;

	constructor(client: ResendClient) {
		if (
			client === null ||
			typeof client !== "object" ||
			client.emails === null ||
			typeof client.emails !== "object" ||
			typeof client.emails.send !== "function"
		) {
			invalidConfiguration("ResendEmailTransport requires a client with an emails.send() method.");
		}
		this.#client = client;
	}

	async send(message: EmailResolvedMessage): Promise<EmailSendResult> {
		const response = await this.#client.emails.send(mapMessage(message));
		if (response.error !== null) {
			throw new EmailError(responseErrorMessage(response.error), {
				code: EmailErrorCode.DELIVERY_FAILED,
				operation: "send",
				transport: this.name,
				cause: response.error,
			});
		}
		if (typeof response.data.id !== "string" || response.data.id.trim().length === 0) {
			throw new EmailError("Resend returned a response without a message id.", {
				code: EmailErrorCode.DELIVERY_FAILED,
				operation: "send",
				transport: this.name,
			});
		}
		return Object.freeze({
			messageId: response.data.id,
			transport: this.name,
		});
	}
}

export function createResendEmailTransport(client: ResendClient): ResendEmailTransport {
	return new ResendEmailTransport(client);
}
