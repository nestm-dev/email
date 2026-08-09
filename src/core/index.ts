export {
	emailAddressValue,
	formatEmailAddress,
	normalizeEmailAddress,
	normalizeEmailAddresses,
} from "./email-address.ts";
export { EmailError, EmailErrorCode, isEmailError, normalizeEmailError } from "./email.error.ts";
export type { EmailErrorOptions } from "./email.error.ts";
export { normalizeEmailHeaders } from "./email-header.ts";
export type { EmailRenderer } from "./email.renderer.ts";
export { EmailService } from "./email.service.ts";
export type { EmailServiceOptions } from "./email.service.ts";
export type { EmailTransport } from "./email.transport.ts";
export type {
	EmailAddress,
	EmailAddressInput,
	EmailAttachment,
	EmailContentInput,
	EmailDefaults,
	EmailEnvelopeInput,
	EmailHeaders,
	EmailNamedAddress,
	EmailRenderContext,
	EmailRenderedContent,
	EmailResolvedEnvelope,
	EmailResolvedMessage,
	EmailSendInput,
	EmailSendResult,
} from "./email.types.ts";
