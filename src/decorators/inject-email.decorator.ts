import { Inject } from "@nestjs/common";
import { EMAIL_RENDERER, EMAIL_TRANSPORT } from "../email.tokens.ts";

type InjectionDecorator = ParameterDecorator & PropertyDecorator;

export function InjectEmailTransport(): InjectionDecorator {
	return Inject(EMAIL_TRANSPORT);
}

export function InjectEmailRenderer(): InjectionDecorator {
	return Inject(EMAIL_RENDERER);
}
