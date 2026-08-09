import { EmailModule, EmailService, type EmailTransport } from "@nestm/email";
import { EmailError, type EmailResolvedMessage } from "@nestm/email/core";
import { createReactEmailRenderer, ReactEmailRenderer } from "@nestm/email/renderers/react-email";
import { createNodemailerEmailTransport } from "@nestm/email/transports/nodemailer";
import { createResendEmailTransport } from "@nestm/email/transports/resend";
import { createEmailTestingModule, MemoryEmailTransport } from "@nestm/email/testing";

declare const transport: EmailTransport;
declare const message: EmailResolvedMessage;

EmailModule.forRoot({ transport });
EmailModule.forRootAsync({ useFactory: () => ({ transport }) });
// @ts-expect-error packed declarations require exactly one async strategy
EmailModule.forRootAsync({});
void EmailService;
void EmailError;
void message;
void ReactEmailRenderer;
void createReactEmailRenderer;
void createNodemailerEmailTransport;
void createResendEmailTransport;
void createEmailTestingModule;
void MemoryEmailTransport;
