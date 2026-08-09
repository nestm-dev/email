import {
	EmailError,
	EmailErrorCode,
	isEmailError,
	normalizeEmailError,
} from "../../src/core/index.ts";
import { describe, expect, it } from "vitest";

describe("EmailError", () => {
	it("preserves existing email errors", () => {
		const error = new EmailError("invalid", {
			code: EmailErrorCode.INVALID_ARGUMENT,
			permanent: true,
		});

		expect(isEmailError(error)).toBe(true);
		expect(normalizeEmailError(error, { code: EmailErrorCode.DELIVERY_FAILED })).toBe(error);
	});

	it("normalizes unknown provider errors with their cause", () => {
		const cause = new Error("provider failed");
		const error = normalizeEmailError(cause, {
			code: EmailErrorCode.DELIVERY_FAILED,
			operation: "send",
			transport: "provider",
		});

		expect(error).toMatchObject({
			code: EmailErrorCode.DELIVERY_FAILED,
			message: "provider failed",
			operation: "send",
			transport: "provider",
		});
		expect(error.cause).toBe(cause);
	});
});
