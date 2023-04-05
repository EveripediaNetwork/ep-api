import { CommandFactory } from "nest-commander";
import NotificationsModule from "./App/notifications/notifications.module";

async function bootstrap() {
	try {
		await CommandFactory.run(NotificationsModule);
	} catch (err) {
		console.error(err);
	}
}

bootstrap();
