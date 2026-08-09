export const EmailErrorCode = {
	INVALID_ARGUMENT: "INVALID_ARGUMENT",
	NOT_CONFIGURED: "NOT_CONFIGURED",
	RENDER_FAILED: "RENDER_FAILED",
	DELIVERY_FAILED: "DELIVERY_FAILED",
	VERIFY_FAILED: "VERIFY_FAILED",
	CLOSED: "CLOSED",
} as const;

export type EmailErrorCode = (typeof EmailErrorCode)[keyof typeof EmailErrorCode];

const EMAIL_ERROR_BRAND = Symbol.for("@nestm/email:EmailError");

function isEmailErrorCode(value: unknown): value is EmailErrorCode {
	return Object.values(EmailErrorCode).includes(value as EmailErrorCode);
}

export interface EmailErrorOptions {
	readonly code: EmailErrorCode;
	readonly operation?: "render" | "send" | "verify" | "close";
	readonly transport?: string;
	readonly renderer?: string;
	readonly permanent?: boolean;
	readonly cause?: unknown;
}

export class EmailError extends Error {
	declare readonly [EMAIL_ERROR_BRAND]: true;
	readonly code: EmailErrorCode;
	readonly operation: EmailErrorOptions["operation"];
	readonly transport: string | undefined;
	readonly renderer: string | undefined;
	readonly permanent: boolean;
	override readonly cause?: unknown;

	constructor(message: string, options: EmailErrorOptions) {
		super(message, { cause: options.cause });
		Object.defineProperty(this, EMAIL_ERROR_BRAND, {
			configurable: false,
			enumerable: false,
			value: true,
			writable: false,
		});
		this.name = "EmailError";
		this.code = options.code;
		this.operation = options.operation;
		this.transport = options.transport;
		this.renderer = options.renderer;
		this.permanent = options.permanent === true;
		this.cause = options.cause;
	}
}

export function isEmailError(error: unknown): error is EmailError {
	if (error instanceof EmailError) {
		return true;
	}
	if (!(error instanceof Error) || error.name !== "EmailError") {
		return false;
	}

	try {
		const candidate = error as Error & {
			readonly [EMAIL_ERROR_BRAND]?: unknown;
			readonly code?: unknown;
			readonly operation?: unknown;
			readonly permanent?: unknown;
			readonly renderer?: unknown;
			readonly transport?: unknown;
		};
		const hasCompatibleBrand =
			candidate[EMAIL_ERROR_BRAND] === true || candidate[EMAIL_ERROR_BRAND] === undefined;
		return (
			hasCompatibleBrand &&
			isEmailErrorCode(candidate.code) &&
			typeof candidate.permanent === "boolean" &&
			(candidate.operation === undefined ||
				candidate.operation === "render" ||
				candidate.operation === "send" ||
				candidate.operation === "verify" ||
				candidate.operation === "close") &&
			(candidate.transport === undefined || typeof candidate.transport === "string") &&
			(candidate.renderer === undefined || typeof candidate.renderer === "string")
		);
	} catch {
		return false;
	}
}

export function normalizeEmailError(
	error: unknown,
	options: Omit<EmailErrorOptions, "cause">,
): EmailError {
	if (isEmailError(error)) {
		return error;
	}
	return new EmailError(error instanceof Error ? error.message : String(error), {
		...options,
		cause: error,
	});
}
