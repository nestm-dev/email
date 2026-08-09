# Security policy

## Supported versions

`@nestm/email` is prerelease software. Security fixes are provided on the latest
published alpha only.

## Reporting a vulnerability

Report suspected vulnerabilities privately through GitHub Security Advisories
for [`nestm-dev/email`](https://github.com/nestm-dev/email/security/advisories/new).
Do not open a public issue for a suspected vulnerability.

Include affected versions, a minimal reproduction, impact, and any suggested
mitigation. Maintainers will coordinate disclosure after a fix is available.

## Security boundary

This package normalizes messages and connects application-created renderers and
transports. It does not authenticate users, authorize recipients, sanitize
application HTML, manage provider credentials, enforce attachment limits, or
provide delivery idempotency.

Applications remain responsible for:

- authorizing every recipient, sender identity, template, and attachment;
- keeping provider API keys and SMTP credentials server-side and outside source
  control;
- using TLS and provider accounts with the least permissions required;
- escaping or sanitizing untrusted values before they become raw HTML;
- limiting attachment size and validating filenames, media types, and content;
- keeping `bcc` recipients, message bodies, reset links, and provider responses
  out of logs, traces, analytics, and client-visible errors;
- applying rate limits, abuse prevention, suppression lists, consent, and
  unsubscribe requirements appropriate to the application;
- designing idempotency and retries around provider-specific delivery
  guarantees; and
- closing application-owned provider resources during graceful shutdown.

The package rejects line breaks, address-list syntax inside a single mailbox,
and routing headers supplied through the free-form header map. These checks
reduce recipient/header-injection risk but are not a substitute for recipient
authorization or content policy.

## Provider and renderer integrations

Resend and Nodemailer adapters accept structural objects. Passing a compatible
object means trusting its implementation with complete normalized messages.
Construct these clients in trusted application infrastructure and do not accept
them from untrusted plugin or request input.

The Nodemailer adapter leaves the transporter application-owned by default.
Only enable `closeTransporter` when no other component shares it. Configure SMTP
certificate verification and authentication on the transporter itself.

React escapes string children, but applications can still introduce unsafe HTML
through React escape hatches, third-party components, links, and remote assets.
Review template code and never treat rendering as sanitization.

## Errors and observability

`EmailError.cause` may retain a native provider error. Provider errors can
contain email addresses, message metadata, response bodies, request identifiers,
or credential-bearing URLs. Redact causes before logging or returning them.

Do not record complete messages from `MemoryEmailTransport` in production. It is
a testing utility and stores normalized message bodies and recipients in
memory.

## Delivery ambiguity

The package deliberately does not retry sends. A timeout or connection failure
can occur after a provider accepted a message, so retrying blindly can deliver
duplicates. Applications that require retries should use a durable outbox,
stable idempotency identifiers where supported, and provider-specific delivery
reconciliation.
