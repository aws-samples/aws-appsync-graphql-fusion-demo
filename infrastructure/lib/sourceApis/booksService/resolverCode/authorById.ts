import {Context, util} from '@aws-appsync/utils';
import { defaultResponseHandler } from "./commonUtils";

export function request(ctx: Context) {
    return {
        operation: 'Query',
        query: {
            expression: '#authorId = :authorId',
            expressionNames: {
                '#authorId': 'authorId'
            },
            expressionValues: {
                ':authorId': util.dynamodb.toDynamoDB(ctx.args.id)
            }
        },
        index: 'book-author-index',
        scanIndexForward: true,
        select: 'ALL_ATTRIBUTES'
    }
}


export function response(ctx: Context) {
    if (ctx.error) {
        util.error(ctx.error.message, ctx.error.type, ctx.result)
    }

    return {
        id: ctx.args.id,
        books: ctx.result
    }
}
