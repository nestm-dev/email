export interface EmailNamedAddress {
	readonly address: string;
	readonly name?: string;
}

export type EmailAddress = string | EmailNamedAddress;

export type EmailAddressInput = EmailAddress | readonly EmailAddress[];

export interface EmailAttachment {
	readonly filename: string;
	/** UTF-8 text when provided as a string; use Uint8Array for binary bytes. */
	readonly content: string | Uint8Array;
	readonly contentType?: string;
	readonly contentId?: string;
	readonly disposition?: "attachment" | "inline";
}

export type EmailHeaders = Readonly<Record<string, string>>;

export interface EmailDefaults {
	readonly from?: EmailAddress;
	readonly replyTo?: EmailAddressInput;
	readonly headers?: EmailHeaders;
}

export interface EmailEnvelopeInput {
	readonly from?: EmailAddress;
	readonly to: EmailAddressInput;
	readonly cc?: EmailAddressInput;
	readonly bcc?: EmailAddressInput;
	readonly replyTo?: EmailAddressInput;
	readonly subject: string;
	readonly headers?: EmailHeaders;
	readonly attachments?: readonly EmailAttachment[];
}

export interface EmailResolvedEnvelope {
	readonly from: EmailAddress;
	readonly to: readonly EmailAddress[];
	readonly cc?: readonly EmailAddress[];
	readonly bcc?: readonly EmailAddress[];
	readonly replyTo?: readonly EmailAddress[];
	readonly subject: string;
	readonly headers?: EmailHeaders;
	readonly attachments?: readonly EmailAttachment[];
}

export type EmailRenderedContent =
	| {
			readonly html: string;
			readonly text?: string;
	  }
	| {
			readonly text: string;
			readonly html?: string;
	  };

export type EmailContentInput<TEMPLATE = unknown> =
	| (EmailRenderedContent & {
			readonly template?: never;
	  })
	| {
			readonly template: TEMPLATE;
			readonly html?: never;
			readonly text?: never;
	  };

export type EmailSendInput<TEMPLATE = unknown> = EmailEnvelopeInput & EmailContentInput<TEMPLATE>;

export type EmailResolvedMessage = EmailResolvedEnvelope & EmailRenderedContent;

export type EmailRenderContext = EmailResolvedEnvelope;

export interface EmailSendResult {
	readonly messageId: string;
	readonly transport: string;
	readonly accepted?: readonly string[];
	readonly rejected?: readonly string[];
	readonly response?: string;
}
