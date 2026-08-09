export * from "./core/index.ts";
export { InjectEmailRenderer, InjectEmailTransport } from "./decorators/inject-email.decorator.ts";
export type { EmailForRootAsyncOptions, EmailForRootOptions } from "./email.module-definition.ts";
export { EmailModule } from "./email.module.ts";
export { EMAIL_MODULE_OPTIONS, EMAIL_RENDERER, EMAIL_TRANSPORT } from "./email.tokens.ts";
export { defineEmailConfig } from "./email.types.ts";
export type { EmailModuleExtras, EmailModuleOptions, EmailOptionsFactory } from "./email.types.ts";
