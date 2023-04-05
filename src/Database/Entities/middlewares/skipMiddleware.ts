import { FieldMiddleware, MiddlewareContext, NextFn } from "@nestjs/graphql";

const skipMiddleware: FieldMiddleware = async (
	ctx: MiddlewareContext,
	next: NextFn,
) => {
	const value = await next();
	const allowedEndpoints = ["userById", "getProfile", "getProfileLikeUsername"];
	const { prev } = ctx.info.path;
	const allowed = allowedEndpoints.some(
		(endpoint) =>
			endpoint === `${prev?.prev?.key}` || endpoint === `${prev?.key}`,
	);
	if (!allowed) {
		return null;
	}
	return value;
};
export default skipMiddleware;
