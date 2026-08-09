import { createElement } from "react";
import { describe, expect, it } from "vitest";

import { EmailErrorCode } from "../../src/core/index.ts";
import {
	createReactEmailRenderer,
	ReactEmailRenderer,
} from "../../src/renderers/react-email/index.ts";

const context = {
	from: "sender@example.com",
	to: ["person@example.com"],
	subject: "Renderer test",
} as const;

describe("ReactEmailRenderer", () => {
	it("renders React elements to HTML and plain text by default", async () => {
		const renderer = new ReactEmailRenderer();

		const result = await renderer.render(
			createElement("main", null, createElement("h1", null, "Welcome Kauan")),
			context,
		);

		expect(result.html).toContain("Welcome Kauan");
		expect(result.text).toContain("WELCOME KAUAN");
	});

	it("can omit the generated plain-text alternative", async () => {
		const renderer = createReactEmailRenderer({
			plainText: false,
			pretty: true,
		});

		const result = await renderer.render(createElement("p", null, "HTML only"), context);

		expect(result.html).toContain("HTML only");
		expect("text" in result).toBe(false);
	});

	it("rejects values that are not React elements", async () => {
		const renderer = new ReactEmailRenderer();

		await expect(renderer.render({ component: "not-react" }, context)).rejects.toMatchObject({
			code: EmailErrorCode.INVALID_ARGUMENT,
			renderer: "react-email",
		});
	});
});
