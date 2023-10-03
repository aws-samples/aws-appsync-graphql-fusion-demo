import {Context, util} from "@aws-appsync/utils";
import {defaultResponseHandler} from "./commonUtils";


export function request(ctx: Context) {
    return {
        operation: "DeleteItem",
        key: util.dynamodb.toMapValues({ id: ctx.args.input.id }),
    };
}

export function response(ctx: Context) {
    return defaultResponseHandler(ctx);
}