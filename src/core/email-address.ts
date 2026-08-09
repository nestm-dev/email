import { EmailError, EmailErrorCode } from "./email.error.ts";
import type { EmailAddress, EmailAddressInput } from "./email.types.ts";

function invalidAddress(message: string): never {
	throw new EmailError(message, {
		code: EmailErrorCode.INVALID_ARGUMENT,
		permanent: true,
	});
}

function assertHeaderSafe(value: unknown, label: string): string {
	if (typeof value !== "string") {
		invalidAddress(`${label} must be a string.`);
	}
	const normalized = value.trim();
	if (normalized.length === 0) {
		invalidAddress(`${label} must not be empty.`);
	}
	if (/\r|\n/.test(normalized)) {
		invalidAddress(`${label} must not contain line breaks.`);
	}
	return normalized;
}

function assertSingleMailbox(value: string, label: string, allowDisplayName = true): string {
	if (/,|;/.test(value)) {
		invalidAddress(`${label} must contain exactly one mailbox.`);
	}

	const lessThan = value.indexOf("<");
	const greaterThan = value.indexOf(">");
	let mailbox = value;
	if (lessThan !== -1 || greaterThan !== -1) {
		if (
			!allowDisplayName ||
			lessThan <= 0 ||
			greaterThan !== value.length - 1 ||
			value.indexOf("<", lessThan + 1) !== -1 ||
			value.indexOf(">", greaterThan + 1) !== -1
		) {
			invalidAddress(`${label} must contain exactly one mailbox.`);
		}
		mailbox = value.slice(lessThan + 1, greaterThan).trim();
	}

	if (/\s|<|>/.test(mailbox)) {
		invalidAddress(`${label} contains invalid mailbox syntax.`);
	}
	const at = mailbox.indexOf("@");
	if (at <= 0 || at !== mailbox.lastIndexOf("@") || at === mailbox.length - 1) {
		invalidAddress(`${label} must contain one email address with a local and domain part.`);
	}
	return value;
}

export function normalizeEmailAddress(
	address: EmailAddress,
	label = "email address",
): EmailAddress {
	if (typeof address === "string") {
		return assertSingleMailbox(assertHeaderSafe(address, label), label);
	}
	if (address === null || typeof address !== "object") {
		return invalidAddress(`${label} must be a string or named address.`);
	}
	const candidate = address as {
		readonly address?: unknown;
		readonly name?: unknown;
	};
	const normalizedAddress = assertSingleMailbox(
		assertHeaderSafe(candidate.address, `${label}.address`),
		`${label}.address`,
		false,
	);
	if (candidate.name === undefined) {
		return Object.freeze({ address: normalizedAddress });
	}
	return Object.freeze({
		address: normalizedAddress,
		name: assertHeaderSafe(candidate.name, `${label}.name`),
	});
}

export function normalizeEmailAddresses(
	input: EmailAddressInput,
	label: string,
	options: { readonly allowEmpty?: boolean } = {},
): readonly EmailAddress[] {
	const values = Array.isArray(input) ? input : [input];
	if (values.length === 0 && options.allowEmpty !== true) {
		invalidAddress(`${label} must contain at least one email address.`);
	}
	return values.map((address, index) => normalizeEmailAddress(address, `${label}[${index}]`));
}

export function formatEmailAddress(address: EmailAddress): string {
	const normalized = normalizeEmailAddress(address);
	if (typeof normalized === "string") {
		return normalized;
	}
	if (normalized.name === undefined) {
		return normalized.address;
	}
	const escapedName = normalized.name.replaceAll("\\", "\\\\").replaceAll('"', '\\"');
	return `"${escapedName}" <${normalized.address}>`;
}

export function emailAddressValue(address: EmailAddress): string {
	const normalized = normalizeEmailAddress(address);
	return typeof normalized === "string" ? normalized : normalized.address;
}
