import { EmailError, EmailErrorCode } from "./email.error.ts";
import type { EmailHeaders } from "./email.types.ts";

const HEADER_NAME = /^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/;

const RESERVED_HEADERS = new Set([
	"bcc",
	"cc",
	"from",
	"reply-to",
	"resent-bcc",
	"resent-cc",
	"resent-from",
	"resent-sender",
	"resent-to",
	"return-path",
	"sender",
	"subject",
	"to",
]);

function invalidHeader(message: string): never {
	throw new EmailError(message, {
		code: EmailErrorCode.INVALID_ARGUMENT,
		permanent: true,
	});
}

function headerEntries(
	headers: EmailHeaders | undefined,
	label: string,
): readonly (readonly [string, unknown])[] {
	if (headers === undefined) {
		return [];
	}
	if (headers === null || typeof headers !== "object" || Array.isArray(headers)) {
		invalidHeader(`${label} must be an object containing string header values.`);
	}
	return Object.entries(headers as Readonly<Record<string, unknown>>);
}

export function normalizeEmailHeaders(
	defaults?: EmailHeaders,
	headers?: EmailHeaders,
): EmailHeaders | undefined {
	const entries = [
		...headerEntries(defaults, "Default email headers"),
		...headerEntries(headers, "Email headers"),
	];
	if (entries.length === 0) {
		return undefined;
	}

	const normalized = new Map<string, readonly [name: string, value: string]>();
	for (const [name, value] of entries) {
		if (!HEADER_NAME.test(name)) {
			invalidHeader(`Invalid email header name "${name}".`);
		}
		const normalizedName = name.toLowerCase();
		if (RESERVED_HEADERS.has(normalizedName)) {
			invalidHeader(`Email header "${name}" is controlled by the structured message fields.`);
		}
		if (typeof value !== "string" || /\r|\n/.test(value)) {
			invalidHeader(`Email header "${name}" must be a string without line breaks.`);
		}
		normalized.set(normalizedName, [name, value]);
	}
	return Object.freeze(Object.fromEntries(normalized.values()));
}
