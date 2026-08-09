# Contributing

## Setup

```sh
corepack enable
pnpm install
```

Node.js 22.12 or newer is required. The package is ESM-only and targets the
NestJS 12 prerelease line.

## Workflow

```sh
pnpm run check        # Oxlint, Prettier, and TypeScript
pnpm run test         # unit, integration, compile-time, and package tests
pnpm run build        # ESM and declaration output in dist/
pnpm run verify:pack  # build and validate the packed public package
pnpm run verify       # all local release gates
```

Add a Changeset for every user-visible change:

```sh
pnpm changeset
```

## Design rules

- Keep rendering and delivery separate. A renderer produces HTML/text; a
  transport sends a fully resolved message.
- Keep the core provider-neutral. Provider request, response, and error types
  must not leak through `@nestm/email` or `@nestm/email/core`.
- Keep optional entry points independently importable and side-effect free.
  Root imports must never load React Email, Resend, or Nodemailer.
- Provider clients are application-owned. Integrations accept structural
  clients or transporters and must not read credentials from ambient
  environment variables.
- Make resource ownership explicit. In particular, do not close a caller-owned
  client unless the adapter contract documents an opt-in.
- Preserve the framework-neutral core boundary: no NestJS imports in
  `src/core` runtime code or emitted declarations.
- Normalize public failures to `EmailError` without discarding the original
  cause. Never place credentials or complete message content in package-created
  error messages.
- Validate envelope and content input before invoking a renderer or transport.
  Preserve header-injection protections.
- Do not add automatic delivery retries without a design for ambiguous provider
  outcomes and duplicate messages.
- Preserve ESM output, explicit package exports, source maps, declarations, and
  emitted Nest decorator metadata.

## Tests

- Unit-test core normalization, renderer and transport mapping, error handling,
  verification, and lifecycle behavior.
- Exercise `forRoot()` and all `forRootAsync()` factory modes through
  `@nestjs/testing`.
- Add compile-time tests for public generics, mutually exclusive direct/template
  content, and structural provider contracts.
- Test every exported subpath from the packed package, not only source barrels.
- Tests must not send live email. Use the memory transport, fake structural
  clients, and Nodemailer's non-network test transports.
- A change to an optional adapter must verify that the root and core entry points
  still load without that adapter's dependencies installed.

## Documentation

Document new public behavior in `README.md`, including installation of optional
peers, ownership, failure behavior, and a complete example. Keep package entry
point and compatibility tables synchronized with `package.json`.

## Pull requests

Keep changes focused, include regression coverage, and run `pnpm run verify`
before requesting review. Call out changes to provider mapping, message
ownership, lifecycle, package exports, or minimum runtime versions explicitly.
