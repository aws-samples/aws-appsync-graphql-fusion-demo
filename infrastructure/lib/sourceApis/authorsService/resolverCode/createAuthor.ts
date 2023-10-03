import {Context, util} from "@aws-appsync/utils";
import { defaultResponseHandler } from "./commonUtils";

export function request(ctx: Context) {
    return {
        operation: "PutItem",
        key: util.dynamodb.toMapValues({ id: util.autoId() }),
        attributeValues: util.dynamodb.toMapValues(ctx.args.input),
        condition: {
            expression: "attribute_not_exists(#id)",
            expressionNames: {
                "#id": "id",
            },
        }
    };
}

export function response(ctx: Context) {
    return defaultResponseHandler(ctx);
}