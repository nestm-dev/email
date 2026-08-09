import { createElement } from "react";
import { Resend } from "resend";
import nodemailer from "nodemailer";

import { createReactEmailRenderer } from "../../src/renderers/react-email/index.ts";
import { createNodemailerEmailTransport } from "../../src/transports/nodemailer/index.ts";
import { createResendEmailTransport } from "../../src/transports/resend/index.ts";

const renderer = createReactEmailRenderer({ plainText: true, pretty: false });
void renderer.render(createElement("p", null, "Hello"), {
	from: "sender@example.com",
	to: ["person@example.com"],
	subject: "Hello",
});

const resend = new Resend("re_test");
createResendEmailTransport(resend);

const nodemailerTransporter = nodemailer.createTransport({ jsonTransport: true });
createNodemailerEmailTransport(nodemailerTransporter, {
	closeTransporter: true,
});
