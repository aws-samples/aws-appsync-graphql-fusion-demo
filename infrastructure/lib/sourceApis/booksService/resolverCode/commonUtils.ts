import {Context, util} from "@aws-appsync/utils";


export function defaultResponseHandler(ctx: Context) {
    if (ctx.error) {
        util.error(ctx.error.message, ctx.error.type, ctx.result)
    }

    return ctx.result
}