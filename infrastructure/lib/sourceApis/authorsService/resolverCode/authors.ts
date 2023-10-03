import {Context} from "@aws-appsync/utils";
import {defaultResponseHandler} from "./commonUtils";

export function request(ctx: Context) {
    const { limit = 10 } = ctx.args;
    return { operation: "Scan", limit};
}

export function response(ctx: Context) {
    return defaultResponseHandler(ctx);
}