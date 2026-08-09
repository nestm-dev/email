import type { EmailRenderContext, EmailRenderedContent } from "./email.types.ts";

export interface EmailRenderer {
	readonly name: string;

	render(
		template: unknown,
		context: EmailRenderContext,
	): EmailRenderedContent | Promise<EmailRenderedContent>;
}
