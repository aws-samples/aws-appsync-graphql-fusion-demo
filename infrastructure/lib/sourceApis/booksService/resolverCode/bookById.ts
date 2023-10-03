import {Context, util} from "@aws-appsync/utils";
import {defaultResponseHandler} from "./commonUtils";


export function request(ctx: Context) {
    return {
        operation: "GetItem",
        key: util.dynamodb.toMapValues({ id: ctx.args.id }),
    };
}

export function response(ctx: Context) {
    return defaultResponseHandler(ctx);
}
