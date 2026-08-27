# @nestm/email

Provider-neutral email delivery for **NestJS 12**. The package separates message
composition from delivery, keeps provider clients application-owned, and exposes
framework-neutral primitives for workers and scripts.

- `EmailModule.forRoot()` and `forRootAsync()` with Nest dependency injection
- Direct HTML/text messages or renderer-backed templates
- Shared defaults for `from`, `replyTo`, and headers
- Framework-neutral service and contracts through `@nestm/email/core`
- React Email rendering through `@nestm/email/renderers/react-email`
- Structural Resend and Nodemailer transports
- An in-memory transport and local testing module through `@nestm/email/testing`

> This package targets stable NestJS 12 and is itself published on
> the `alpha` dist-tag.

## Requirements

- Node.js 22.12 or newer
- NestJS `^12.0.0` for the root entry point
- ESM

`@nestm/email/core` has no NestJS imports. Provider SDKs remain
application-owned: the root package does not create a Resend client, SMTP
connection, or another provider client from environment variables.

## Installation

```sh
pnpm add @nestm/email@alpha @nestjs/common @nestjs/core reflect-metadata rxjs
```

Install only the optional integration used by the application:

```sh
# React Email templates
pnpm add react react-dom react-email @react-email/render

# Resend delivery
pnpm add resend

# SMTP and other Nodemailer transports
pnpm add nodemailer
pnpm add --save-dev @types/nodemailer
```

## Quick start

Create the provider client in application infrastructure and pass its structural
interface to the adapter:

```ts
import { Module } from "@nestjs/common";
import { EmailModule } from "@nestm/email";
import { createResendEmailTransport } from "@nestm/email/transports/resend";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

@Module({
	imports: [
		EmailModule.forRoot({
			transport: createResendEmailTransport(resend),
			defaults: {
				from: { name: "Acme", address: "hello@example.com" },
				replyTo: "support@example.com",
				headers: { "X-Application": "api" },
			},
		}),
	],
})
export class AppModule {}
```

Inject `EmailService` and send HTML, plain text, or both:

```ts
import { Injectable } from "@nestjs/common";
import { EmailService } from "@nestm/email";

@Injectable()
export class PasswordResetService {
	constructor(private readonly email: EmailService) {}

	sendReset(address: string, resetUrl: string) {
		return this.email.send({
			to: address,
			subject: "Reset your password",
			html: `<p><a href="${resetUrl}">Reset your password</a></p>`,
			text: `Reset your password: ${resetUrl}`,
		});
	}
}
```

`from` is required after defaults and per-message options are merged. `to` and
`subject` are always required. A successful send resolves to an
`EmailSendResult` containing at least `messageId` and `transport`.

## Transport versus renderer

A **transport** delivers a fully resolved email. It owns provider mapping,
provider-result normalization, verification when supported, and optional
connection cleanup. Resend and Nodemailer are transports.

A **renderer** turns the value passed as `template` into HTML and/or text. It
does not deliver anything. React Email is a renderer.

Direct `html`/`text` content bypasses the configured renderer. A `template`
requires one, and the two modes are mutually exclusive:

```ts
// Direct content: no renderer required.
await email.send({
	to: "person@example.com",
	subject: "Plain message",
	text: "Hello",
});

// Template content: rendered before the transport receives it.
await email.send({
	to: "person@example.com",
	subject: "Rendered message",
	template: templateValue,
});
```

This boundary keeps React elements and provider SDK request types out of the
root API.

## React Email renderer

Configure the optional renderer alongside any transport:

```tsx
import { Button, Html, Text } from "react-email";
import { EmailModule } from "@nestm/email";
import { createReactEmailRenderer } from "@nestm/email/renderers/react-email";
import { createResendEmailTransport } from "@nestm/email/transports/resend";

function WelcomeEmail(props: { name: string; activationUrl: string }) {
	return (
		<Html>
			<Text>Welcome, {props.name}.</Text>
			<Button href={props.activationUrl}>Activate account</Button>
		</Html>
	);
}

EmailModule.forRoot({
	transport: createResendEmailTransport(resend),
	renderer: createReactEmailRenderer({
		pretty: false,
		plainText: true,
	}),
	defaults: { from: "hello@example.com" },
});

await email.send({
	to: "ada@example.com",
	subject: "Welcome",
	template: <WelcomeEmail name="Ada" activationUrl="https://example.com/activate" />,
});
```

`plainText` defaults to `true`, producing a text alternative alongside HTML.
Set it to `false` when HTML-only output is intentional. `pretty` controls HTML
formatting. `ReactEmailRenderer` is also exported for explicit construction.

The example also uses React Email's optional, application-owned component
package:

```sh
pnpm add react-email
```

The renderer itself relies only on React, React DOM, and
`@react-email/render`.

## Resend transport

The Resend adapter accepts a structural `ResendClient`, so the application
creates and configures the official client:

```ts
import { EmailModule } from "@nestm/email";
import { createResendEmailTransport } from "@nestm/email/transports/resend";
import { Resend } from "resend";

const client = new Resend(process.env.RESEND_API_KEY);

EmailModule.forRoot({
	transport: createResendEmailTransport(client),
	defaults: { from: "notifications@example.com" },
});
```

The adapter maps the normalized email envelope, content, headers, and
attachments to the client. It does not read credentials or construct the
client. The subpath exports its structural client and request/response types so
compatible wrappers can be used without coupling the root package to Resend's
classes. Resend does not expose an attachment-disposition field; `contentId` is
mapped for inline references, while the portable `disposition` hint is ignored
by this adapter.

## Nodemailer transport

Create a Nodemailer transporter in the application and pass it directly:

```ts
import { EmailModule } from "@nestm/email";
import { createNodemailerEmailTransport } from "@nestm/email/transports/nodemailer";
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
	host: process.env.SMTP_HOST,
	port: 587,
	secure: false,
	auth: {
		user: process.env.SMTP_USER,
		pass: process.env.SMTP_PASSWORD,
	},
});

EmailModule.forRoot({
	transport: createNodemailerEmailTransport(transporter),
	defaults: { from: "notifications@example.com" },
});
```

The default adapter does **not** close the application-owned transporter. To
transfer that lifecycle responsibility to `EmailService`, opt in explicitly:

```ts
createNodemailerEmailTransport(transporter, {
	closeTransporter: true,
});
```

The adapter exposes Nodemailer's `verify()` when the structural transporter
implements it. Its subpath exports structural transporter, message, and result
types; the root entry point does not expose Nodemailer types.

## Configuration

`EmailModule` is global by default. Pass `isGlobal: false` when the configured
service should remain local to the importing module:

```ts
EmailModule.forRoot({
	transport,
	defaults: {
		from: "hello@example.com",
		replyTo: ["support@example.com", "audit@example.com"],
		headers: { "X-Environment": "production" },
	},
	isGlobal: false,
});
```

Per-message `from`, `replyTo`, and headers override or extend configured
defaults. Header names and values, subjects, addresses, and attachment metadata
are validated before rendering or delivery to reject line-break injection and
other malformed input. Routing headers such as `From`, `To`, `Cc`, `Bcc`,
`Reply-To`, and `Sender` are reserved for the structured message fields and
cannot be supplied through `headers`.

Register `forRoot()` or `forRootAsync()` exactly once per Nest application
context. One root registration represents one default transport and renderer;
multiple roots make the exported injection tokens ambiguous and may invoke
lifecycle hooks more than once for a shared transport. Re-export the configured
module from an application infrastructure module when several features need it.

### Async configuration

`forRootAsync()` supports Nest's `useFactory`, `useClass`, and `useExisting`
patterns:

```ts
import { ConfigModule, ConfigService } from "@nestjs/config";
import { EmailModule } from "@nestm/email";
import { createResendEmailTransport } from "@nestm/email/transports/resend";
import { Resend } from "resend";

EmailModule.forRootAsync({
	imports: [ConfigModule],
	inject: [ConfigService],
	useFactory: (config: ConfigService) => ({
		transport: createResendEmailTransport(new Resend(config.getOrThrow("RESEND_API_KEY"))),
		defaults: {
			from: config.getOrThrow("EMAIL_FROM"),
			replyTo: config.get("EMAIL_REPLY_TO"),
		},
	}),
});
```

Class and existing factories implement
`EmailOptionsFactory.createEmailOptions()`. `defineEmailConfig()` is available
as an identity helper for reusable typed configuration.

### Addresses, headers, and attachments

Each address value represents exactly one mailbox and can be a string or named
value. Use an array wherever a field needs more than one address; address-list
syntax inside one string is rejected:

```ts
await email.send({
	from: { name: "Acme Billing", address: "billing@example.com" },
	to: ["ada@example.com", { name: "Grace", address: "grace@example.com" }],
	cc: "owner@example.com",
	replyTo: "support@example.com",
	subject: "Your receipt",
	headers: { "X-Correlation-ID": requestId },
	text: "Receipt attached.",
	attachments: [
		{
			filename: "receipt.txt",
			content: receipt,
			contentType: "text/plain",
		},
	],
});
```

Attachment content is UTF-8 text when supplied as a string; strings are never
interpreted as base64. Use `Uint8Array` for binary bytes. Applications remain
responsible for enforcing attachment size, content, and retention policies
before calling the library.

### Direct integration injection

Most application code should use `EmailService`. Low-level integrations are
also injectable when provider-specific operations are unavoidable:

```ts
import {
	InjectEmailRenderer,
	InjectEmailTransport,
	type EmailRenderer,
	type EmailTransport,
} from "@nestm/email";

constructor(
	@InjectEmailTransport() readonly transport: EmailTransport,
	@InjectEmailRenderer() readonly renderer: EmailRenderer | null,
) {}
```

`EMAIL_TRANSPORT`, `EMAIL_RENDERER`, and `EMAIL_MODULE_OPTIONS` are exported for
manual provider overrides.

## Framework-neutral core

Workers and scripts can use the service and contracts without NestJS:

```ts
import { EmailService, type EmailTransport } from "@nestm/email/core";

declare const transport: EmailTransport;

const email = new EmailService({
	transport,
	defaults: { from: "worker@example.com" },
});

await email.send({
	to: "person@example.com",
	subject: "Background job complete",
	text: "Your export is ready.",
});

await email.close();
```

The core entry point exports `EmailService`, `EmailTransport`, `EmailRenderer`,
message and address types, normalization helpers, and the package error model.
It does not import NestJS or any concrete provider SDK.

## Lifecycle

`EmailService.close()` is idempotent and invokes the configured transport's
optional `close()` method. Nest calls the same path through
`onApplicationShutdown()` when the application context shuts down. Calls to
`send()` or `verify()` after closure fail with `EmailErrorCode.CLOSED`.
Concurrent close calls await the same operation. Its result is retained, so a
failed cleanup is reported consistently and is not retried implicitly.

`await email.verify()` delegates to the transport's optional `verify()` hook;
it is a no-op when the transport has no verification operation. Verification is
never performed automatically during module bootstrap.

Provider ownership is adapter-specific:

- Resend has no connection resource for the adapter to close.
- Nodemailer remains application-owned unless `closeTransporter: true` is set.
- Custom transports decide what their `close()` implementation owns.
- Renderers have no lifecycle hook.

Applications using long-lived Nest processes should enable and exercise their
normal graceful-shutdown path. Framework-neutral consumers should call
`email.close()` explicitly.

## Errors

Validation, rendering, verification, lifecycle, and delivery failures are
reported as `EmailError` with one of these codes:

- `INVALID_ARGUMENT`
- `NOT_CONFIGURED`
- `RENDER_FAILED`
- `DELIVERY_FAILED`
- `VERIFY_FAILED`
- `CLOSED`

`isEmailError()` works across duplicate package copies. Provider failures are
available as `cause`; avoid returning or logging raw causes when provider
responses may contain addresses, message content, or credential-bearing URLs.
The library does not retry sends automatically because an ambiguous provider
failure may already have delivered the message.

## Testing

Use the in-memory transport to inspect normalized, rendered messages without a
network request:

```ts
import { Test } from "@nestjs/testing";
import { EmailService } from "@nestm/email";
import { createEmailTestingModule, createMemoryEmailTransport } from "@nestm/email/testing";

const transport = createMemoryEmailTransport();
const moduleRef = await Test.createTestingModule({
	imports: [
		createEmailTestingModule({
			transport,
			defaults: { from: "test@example.com" },
		}),
	],
}).compile();

await moduleRef.get(EmailService).send({
	to: "person@example.com",
	subject: "Test",
	text: "Recorded, not delivered.",
});

expect(transport.messages).toHaveLength(1);
expect(transport.messages[0]?.subject).toBe("Test");

await moduleRef.close();
```

Testing modules are local by default to prevent state from leaking between
tests. `MemoryEmailTransport.clear()` removes recorded messages. A custom
renderer can be passed to `createEmailTestingModule()` for template tests.

## Package entry points

| Entry point                          | Purpose                                      | Optional runtime                   |
| ------------------------------------ | -------------------------------------------- | ---------------------------------- |
| `@nestm/email`                       | NestJS module, service, tokens, and core API | NestJS                             |
| `@nestm/email/core`                  | Framework-neutral service and contracts      | None                               |
| `@nestm/email/renderers/react-email` | React element to HTML/text renderer          | React Email                        |
| `@nestm/email/transports/resend`     | Structural Resend delivery adapter           | Application Resend client          |
| `@nestm/email/transports/nodemailer` | Structural Nodemailer delivery adapter       | Application Nodemailer transporter |
| `@nestm/email/testing`               | In-memory transport and testing module       | NestJS for the module helper       |

Every optional subpath is independently importable. Importing the root or core
entry point does not load React Email, Resend, or Nodemailer.

## Non-goals

- Template storage, discovery, localization, or versioning
- Queues, scheduling, retries, deduplication, or delivery webhooks
- Contact lists, unsubscribe management, or campaign analytics
- Provider-client construction or ambient credential lookup
- Sanitizing application-provided HTML or deciding whether user content is safe

Compose those concerns in the application or dedicated infrastructure around
the small renderer/transport boundary.

## License

BSD-3-Clause
