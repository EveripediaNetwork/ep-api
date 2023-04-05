import { HttpModule } from "@nestjs/axios";

const httpModule = (time: number) =>
	HttpModule.register({
		timeout: time,
		maxRedirects: 5,
	});

export default httpModule;
