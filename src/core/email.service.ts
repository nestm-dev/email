import { EmailError, EmailErrorCode, normalizeEmailError } from "./email.error.ts";
import type { EmailRenderer } from "./email.renderer.ts";
import type { EmailTransport } from "./email.transport.ts";
import { normalizeEmailAddress, normalizeEmailAddresses } from "./email-address.ts";
import { normalizeEmailHeaders } from "./email-header.ts";
import type {
	EmailAddress,
	EmailAddressInput,
	EmailAttachment,
	EmailDefaults,
	EmailHeaders,
	EmailRenderContext,
	EmailRenderedContent,
	EmailResolvedEnvelope,
	EmailResolvedMessage,
	EmailSendInput,
	EmailSendResult,
} from "./email.types.ts";

export interface EmailServiceOptions {
	readonly transport: EmailTransport;
	readonly renderer?: EmailRenderer | null;
	readonly defaults?: EmailDefaults;
}

function invalidArgument(message: string): never {
	throw new EmailError(message, {
		code: EmailErrorCode.INVALID_ARGUMENT,
		permanent: true,
	});
}

function assertComponentName(value: string, label: string): void {
	if (
		typeof value !== "string" ||
		value.length === 0 ||
		value.trim() !== value ||
		/\r|\n/.test(value)
	) {
		invalidArgument(
			`${label} names must be non-empty strings without surrounding whitespace or line breaks.`,
		);
	}
}

function assertTransport(value: unknown): asserts value is EmailTransport {
	if (
		value === null ||
		typeof value !== "object" ||
		typeof (value as { readonly send?: unknown }).send !== "function"
	) {
		invalidArgument("EmailService requires a transport with a send() method.");
	}
	const transport = value as EmailTransport;
	assertComponentName(transport.name, "Email transport");
	if (transport.verify !== undefined && typeof transport.verify !== "function") {
		invalidArgument("Email transport verify must be a function when provided.");
	}
	if (transport.close !== undefined && typeof transport.close !== "function") {
		invalidArgument("Email transport close must be a function when provided.");
	}
}

function assertRenderer(value: unknown): asserts value is EmailRenderer {
	if (
		value === null ||
		typeof value !== "object" ||
		typeof (value as { readonly render?: unknown }).render !== "function"
	) {
		invalidArgument("Email renderer must provide a render() method.");
	}
	assertComponentName((value as EmailRenderer).name, "Email renderer");
}

function normalizeSubject(subject: string): string {
	if (typeof subject !== "string" || subject.trim().length === 0) {
		invalidArgument("Email subject must not be empty.");
	}
	if (/\r|\n/.test(subject)) {
		invalidArgument("Email subject must not contain line breaks.");
	}
	return subject;
}

function normalizeDefaults(defaults: EmailDefaults | undefined): EmailDefaults {
	if (defaults === undefined) {
		return Object.freeze({});
	}
	if (defaults === null || typeof defaults !== "object" || Array.isArray(defaults)) {
		invalidArgument("Email defaults must be an object when provided.");
	}

	const candidate = defaults as {
		readonly from?: unknown;
		readonly replyTo?: unknown;
		readonly headers?: unknown;
	};
	const from =
		candidate.from === undefined
			? undefined
			: normalizeEmailAddress(candidate.from as EmailAddress, "defaults.from");
	const replyTo =
		candidate.replyTo === undefined
			? undefined
			: normalizeEmailAddresses(candidate.replyTo as EmailAddressInput, "defaults.replyTo", {
					allowEmpty: true,
				});
	const headers = normalizeEmailHeaders(candidate.headers as EmailHeaders | undefined, undefined);

	return Object.freeze({
		...(from !== undefined && { from }),
		...(replyTo !== undefined &&
			replyTo.length > 0 && {
				replyTo: Object.freeze(replyTo),
			}),
		...(headers !== undefined && { headers }),
	});
}

function normalizeAttachments(
	attachments?: readonly EmailAttachment[],
): readonly EmailAttachment[] | undefined {
	if (attachments === undefined) {
		return undefined;
	}
	if (!Array.isArray(attachments)) {
		invalidArgument("Email attachments must be an array.");
	}
	if (attachments.length === 0) {
		return undefined;
	}
	return Object.freeze(
		attachments.map((attachment, index) => {
			if (attachment === null || typeof attachment !== "object") {
				invalidArgument(`attachments[${index}] must be an object.`);
			}
			const candidate = attachment as {
				readonly filename?: unknown;
				readonly content?: unknown;
				readonly contentType?: unknown;
				readonly contentId?: unknown;
				readonly disposition?: unknown;
			};
			if (
				typeof candidate.filename !== "string" ||
				candidate.filename.trim().length === 0 ||
				/\r|\n/.test(candidate.filename)
			) {
				invalidArgument(`attachments[${index}].filename must not be empty or contain line breaks.`);
			}
			if (typeof candidate.content !== "string" && !(candidate.content instanceof Uint8Array)) {
				invalidArgument(`attachments[${index}].content must be a string or Uint8Array.`);
			}
			const contentType = candidate.contentType;
			if (
				contentType !== undefined &&
				(typeof contentType !== "string" || contentType.length === 0 || /\r|\n/.test(contentType))
			) {
				invalidArgument(
					`attachments[${index}].contentType must not be empty or contain line breaks.`,
				);
			}
			const contentId = candidate.contentId;
			if (
				contentId !== undefined &&
				(typeof contentId !== "string" || contentId.length === 0 || /\r|\n/.test(contentId))
			) {
				invalidArgument(
					`attachments[${index}].contentId must not be empty or contain line breaks.`,
				);
			}
			if (
				candidate.disposition !== undefined &&
				candidate.disposition !== "attachment" &&
				candidate.disposition !== "inline"
			) {
				invalidArgument(`attachments[${index}].disposition must be "attachment" or "inline".`);
			}
			return Object.freeze({
				filename: candidate.filename,
				content:
					typeof candidate.content === "string"
						? candidate.content
						: new Uint8Array(candidate.content),
				...(contentType !== undefined && {
					contentType,
				}),
				...(contentId !== undefined && {
					contentId,
				}),
				...(candidate.disposition !== undefined && {
					disposition: candidate.disposition,
				}),
			});
		}),
	);
}

function normalizeContent(content: unknown): EmailRenderedContent {
	if (content === null || typeof content !== "object") {
		invalidArgument("An email renderer must return an object containing html or text.");
	}
	const candidate = content as { readonly html?: unknown; readonly text?: unknown };
	const html = "html" in content ? candidate.html : undefined;
	const text = "text" in content ? candidate.text : undefined;
	if (html !== undefined && typeof html !== "string") {
		invalidArgument("Rendered email html must be a string.");
	}
	if (text !== undefined && typeof text !== "string") {
		invalidArgument("Rendered email text must be a string.");
	}
	if ((html ?? "").length === 0 && (text ?? "").length === 0) {
		invalidArgument("Email content must include non-empty html or text.");
	}
	return {
		...(html !== undefined && { html }),
		...(text !== undefined && { text }),
	} as EmailRenderedContent;
}

function normalizeRendererContent(content: unknown, renderer: string): EmailRenderedContent {
	try {
		return normalizeContent(content);
	} catch (error) {
		throw new EmailError(
			error instanceof Error ? error.message : "Email renderer returned invalid content.",
			{
				code: EmailErrorCode.RENDER_FAILED,
				operation: "render",
				renderer,
				permanent: true,
				cause: error,
			},
		);
	}
}

function resolveEnvelope<TEMPLATE>(
	input: EmailSendInput<TEMPLATE>,
	defaults: EmailDefaults,
): EmailResolvedEnvelope {
	const from = input.from ?? defaults.from;
	if (from === undefined) {
		invalidArgument("Email from is required. Pass it to send() or configure defaults.from.");
	}
	const cc =
		input.cc === undefined
			? undefined
			: normalizeEmailAddresses(input.cc, "cc", { allowEmpty: true });
	const bcc =
		input.bcc === undefined
			? undefined
			: normalizeEmailAddresses(input.bcc, "bcc", { allowEmpty: true });
	const replyToInput = input.replyTo ?? defaults.replyTo;
	const replyTo =
		replyToInput === undefined
			? undefined
			: normalizeEmailAddresses(replyToInput, "replyTo", { allowEmpty: true });
	const headers = normalizeEmailHeaders(defaults.headers, input.headers);
	const attachments = normalizeAttachments(input.attachments);

	return Object.freeze({
		from: normalizeEmailAddress(from, "from"),
		to: Object.freeze(normalizeEmailAddresses(input.to, "to")),
		...(cc !== undefined && cc.length > 0 && { cc: Object.freeze(cc) }),
		...(bcc !== undefined && bcc.length > 0 && { bcc: Object.freeze(bcc) }),
		...(replyTo !== undefined &&
			replyTo.length > 0 && {
				replyTo: Object.freeze(replyTo),
			}),
		subject: normalizeSubject(input.subject),
		...(headers !== undefined && { headers }),
		...(attachments !== undefined && { attachments }),
	});
}

function renderContext(envelope: EmailResolvedEnvelope): EmailRenderContext {
	return envelope;
}

export class EmailService {
	readonly #transport: EmailTransport;
	readonly #renderer: EmailRenderer | null;
	readonly #defaults: EmailDefaults;
	#closed = false;
	#closePromise: Promise<void> | undefined;

	constructor(options: EmailServiceOptions) {
		if (options === null || typeof options !== "object") {
			invalidArgument("EmailService options must be an object.");
		}
		assertTransport(options.transport);
		if (options.renderer !== undefined && options.renderer !== null) {
			assertRenderer(options.renderer);
		}
		this.#transport = options.transport;
		this.#renderer = options.renderer ?? null;
		this.#defaults = normalizeDefaults(options.defaults);
	}

	get transportName(): string {
		return this.#transport.name;
	}

	get rendererName(): string | null {
		return this.#renderer?.name ?? null;
	}

	async send<TEMPLATE = unknown>(input: EmailSendInput<TEMPLATE>): Promise<EmailSendResult> {
		this.#assertOpen();
		if (input === null || typeof input !== "object" || Array.isArray(input)) {
			invalidArgument("Email send input must be an object.");
		}
		const envelope = resolveEnvelope(input, this.#defaults);
		let content: EmailRenderedContent;

		if (Object.prototype.hasOwnProperty.call(input, "template")) {
			const renderer = this.#renderer;
			if (renderer === null) {
				throw new EmailError(
					"This email uses a template, but EmailModule has no renderer configured.",
					{
						code: EmailErrorCode.NOT_CONFIGURED,
						operation: "render",
						permanent: true,
					},
				);
			}
			let renderedContent: unknown;
			try {
				renderedContent = await renderer.render(input.template, renderContext(envelope));
			} catch (error) {
				throw normalizeEmailError(error, {
					code: EmailErrorCode.RENDER_FAILED,
					operation: "render",
					renderer: renderer.name,
				});
			}
			content = normalizeRendererContent(renderedContent, renderer.name);
		} else {
			content = normalizeContent(input);
		}

		const message = Object.freeze({ ...envelope, ...content }) as EmailResolvedMessage;
		try {
			const result = await this.#transport.send(message);
			if (
				result === null ||
				typeof result !== "object" ||
				typeof result.messageId !== "string" ||
				result.messageId.trim().length === 0
			) {
				throw new TypeError(
					`Email transport "${this.#transport.name}" returned an empty messageId.`,
				);
			}
			return result;
		} catch (error) {
			throw normalizeEmailError(error, {
				code: EmailErrorCode.DELIVERY_FAILED,
				operation: "send",
				transport: this.#transport.name,
			});
		}
	}

	async verify(): Promise<void> {
		this.#assertOpen();
		try {
			await this.#transport.verify?.();
		} catch (error) {
			throw normalizeEmailError(error, {
				code: EmailErrorCode.VERIFY_FAILED,
				operation: "verify",
				transport: this.#transport.name,
			});
		}
	}

	close(): Promise<void> {
		if (this.#closePromise === undefined) {
			this.#closed = true;
			this.#closePromise = this.#closeTransport();
		}
		return this.#closePromise;
	}

	onApplicationShutdown(): Promise<void> {
		return this.close();
	}

	async #closeTransport(): Promise<void> {
		// Defer the transport callback until #closePromise has been assigned so
		// re-entrant and concurrent close calls observe the same operation.
		await Promise.resolve();
		try {
			await this.#transport.close?.();
		} catch (error) {
			throw normalizeEmailError(error, {
				code: EmailErrorCode.DELIVERY_FAILED,
				operation: "close",
				transport: this.#transport.name,
			});
		}
	}

	#assertOpen(): void {
		if (this.#closed) {
			throw new EmailError("EmailService is closed.", {
				code: EmailErrorCode.CLOSED,
				permanent: true,
			});
		}
	}
}
