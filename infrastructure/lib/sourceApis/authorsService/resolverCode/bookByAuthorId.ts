import {Context, util} from "@aws-appsync/utils";

export function request(ctx: Context) {
    return {
        operation: "GetItem",
        key: util.dynamodb.toMapValues({ id: ctx.args.authorId }),
    };
}

export function response(ctx: Context) {
    if (ctx.error) {
        util.error(ctx.error.message, ctx.error.type, ctx.result)
    }

    return {
        authorId: ctx.args.authorId,
        author: ctx.result
    }
}
