import { defineConfig } from "tsdown";

export default defineConfig({
	entry: [
		"src/index.ts",
		"src/core/index.ts",
		"src/renderers/react-email/index.ts",
		"src/transports/resend/index.ts",
		"src/transports/nodemailer/index.ts",
		"src/testing/index.ts",
	],
	format: ["esm"],
	platform: "node",
	target: "node22",
	dts: true,
	sourcemap: true,
	clean: true,
	fixedExtension: true,
	deps: {
		neverBundle: [
			/^@nestjs\//,
			/^@nestm\//,
			/^@react-email\//,
			/^react(\/|$)/,
			/^react-dom(\/|$)/,
			/^resend(\/|$)/,
			/^nodemailer(\/|$)/,
			"reflect-metadata",
			"rxjs",
		],
	},
});
