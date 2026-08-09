import {
	EmailModule,
	EmailService,
	type EmailOptionsFactory,
	type EmailRenderer,
	type EmailSendInput,
	type EmailTransport,
} from "../../src/index.ts";

const transport: EmailTransport = {
	name: "types",
	send: async () => ({ messageId: "message-1", transport: "types" }),
};

const renderer: EmailRenderer = {
	name: "types",
	render: async () => ({ html: "<p>Hello</p>", text: "Hello" }),
};

EmailModule.forRoot({ transport, renderer });
EmailModule.forRootAsync({
	useFactory: async () => ({ transport, renderer }),
});

class ClassOptionsFactory implements EmailOptionsFactory {
	createEmailOptions() {
		return { transport, renderer };
	}
}

const FACTORY_DEPENDENCY = Symbol("FACTORY_DEPENDENCY");

EmailModule.forRootAsync({
	imports: [],
	inject: [FACTORY_DEPENDENCY],
	provideInjectionTokensFrom: [{ provide: FACTORY_DEPENDENCY, useValue: "dependency" }],
	useFactory: async (_dependency: string) => ({ transport, renderer }),
	isGlobal: false,
});

EmailModule.forRootAsync({
	useClass: ClassOptionsFactory,
});

EmailModule.forRootAsync({
	imports: [],
	useExisting: ClassOptionsFactory,
	isGlobal: true,
});

// @ts-expect-error async registration requires one configuration strategy
EmailModule.forRootAsync({});

// @ts-expect-error useFactory and useClass are mutually exclusive
EmailModule.forRootAsync({
	useFactory: async () => ({ transport }),
	useClass: ClassOptionsFactory,
});

// @ts-expect-error useFactory and useExisting are mutually exclusive
EmailModule.forRootAsync({
	useFactory: async () => ({ transport }),
	useExisting: ClassOptionsFactory,
});

// @ts-expect-error useClass and useExisting are mutually exclusive
EmailModule.forRootAsync({
	useClass: ClassOptionsFactory,
	useExisting: ClassOptionsFactory,
});

// @ts-expect-error an undefined strategy is not a configured strategy
EmailModule.forRootAsync({ useFactory: undefined });

declare const email: EmailService;

void email.send({
	from: "sender@example.com",
	to: ["person@example.com"],
	subject: "Hello",
	html: "<p>Hello</p>",
});

void email.send({
	to: "person@example.com",
	subject: "Hello",
	template: { firstName: "Kauan" },
});

const directContent = {
	from: "sender@example.com",
	to: "person@example.com",
	subject: "Hello",
	text: "Hello",
} satisfies EmailSendInput;
void directContent;

// @ts-expect-error content is required
void email.send({
	from: "sender@example.com",
	to: "person@example.com",
	subject: "Hello",
});

// @ts-expect-error rendered content and a template are mutually exclusive
void email.send({
	from: "sender@example.com",
	to: "person@example.com",
	subject: "Hello",
	html: "<p>Hello</p>",
	template: { firstName: "Kauan" },
});

EmailModule.forRoot({
	// @ts-expect-error a transport must implement send()
	transport: { name: "invalid" },
});
