import { render, toPlainText } from "@react-email/render";
import * as React from "react";

import {
	EmailError,
	EmailErrorCode,
	type EmailRenderContext,
	type EmailRenderedContent,
	type EmailRenderer,
} from "../../core/index.ts";

export interface ReactEmailRendererOptions {
	/** Formats the generated HTML. Defaults to the React Email renderer default. */
	readonly pretty?: boolean;
	/** Generates a plain-text alternative from the rendered HTML. Defaults to true. */
	readonly plainText?: boolean;
}

function assertBooleanOption(
	value: boolean | undefined,
	name: keyof ReactEmailRendererOptions,
): void {
	if (value !== undefined && typeof value !== "boolean") {
		throw new EmailError(`React Email renderer option "${name}" must be a boolean.`, {
			code: EmailErrorCode.INVALID_ARGUMENT,
			operation: "render",
			renderer: "react-email",
			permanent: true,
		});
	}
}

export class ReactEmailRenderer implements EmailRenderer {
	readonly name = "react-email";

	readonly #pretty: boolean | undefined;
	readonly #plainText: boolean;

	constructor(options: ReactEmailRendererOptions = {}) {
		assertBooleanOption(options.pretty, "pretty");
		assertBooleanOption(options.plainText, "plainText");
		this.#pretty = options.pretty;
		this.#plainText = options.plainText !== false;
	}

	async render(template: unknown, _context: EmailRenderContext): Promise<EmailRenderedContent> {
		if (!React.isValidElement(template)) {
			throw new EmailError("React Email templates must be valid React elements.", {
				code: EmailErrorCode.INVALID_ARGUMENT,
				operation: "render",
				renderer: this.name,
				permanent: true,
			});
		}

		const html = await render(
			template,
			this.#pretty === undefined ? undefined : { pretty: this.#pretty },
		);
		if (!this.#plainText) {
			return { html };
		}
		return { html, text: toPlainText(html) };
	}
}

export function createReactEmailRenderer(
	options: ReactEmailRendererOptions = {},
): ReactEmailRenderer {
	return new ReactEmailRenderer(options);
}
