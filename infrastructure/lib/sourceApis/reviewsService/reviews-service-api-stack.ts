import * as cdk from "aws-cdk-lib";
import * as path from "path";
import {Construct} from "constructs";
import {AttributeType, Table} from "aws-cdk-lib/aws-dynamodb";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { AuthorizationType, LambdaRestApi } from "aws-cdk-lib/aws-apigateway";
import { Effect, PolicyStatement } from "aws-cdk-lib/aws-iam";

export class ReviewsServiceApiStack extends cdk.Stack {

    constructor(scope: Construct, id: string) {
        super(scope, id);

        const bookReviewsTable = new Table(this, 'ReviewsDDBTable', {
            partitionKey: {
                name: 'id',
                type: AttributeType.STRING
            },
            tableName: `BookReviewsTable`,
        });

        bookReviewsTable.addGlobalSecondaryIndex({
            partitionKey: {
                name: 'bookId',
                type: AttributeType.STRING
            },
            indexName: 'review-book-index'
        });

        bookReviewsTable.addGlobalSecondaryIndex({
            partitionKey: {
                name: 'reviewerId',
                type: AttributeType.STRING
            },
            indexName: 'review-reviewer-index'
        });

        bookReviewsTable.addGlobalSecondaryIndex({
            partitionKey: {
                name: 'authorId',
                type: AttributeType.STRING
            },
            indexName: 'review-author-index'
        });

        const graphQLYogaServer = new NodejsFunction(this, `GraphQLYogaServer`, {
            entry: path.join(__dirname, 'reviews.ts'),
            timeout: cdk.Duration.seconds(30),
            runtime: Runtime.NODEJS_18_X,
            bundling: {
                commandHooks: {
                    beforeBundling(inputDir, outputDir) {
                        return [];
                    },
                    beforeInstall(inputDir, outputDir) {
                        return [];
                    },
                    afterBundling(inputDir, outputDir) {
                        return [`cp ${__dirname}/schema.graphql ${outputDir}/schema.graphql`];
                    },
                }
            }
        });

        graphQLYogaServer.addToRolePolicy(new PolicyStatement({
            actions: ['dynamodb:GetItem', 'dynamodb:PutItem', 'dynamodb:DeleteItem', 'dynamodb:Query', 'dynamodb:Scan'],
            resources: [bookReviewsTable.tableArn, bookReviewsTable.tableArn + "/*"],
            effect: Effect.ALLOW
        }));

        const reviewsApi = new LambdaRestApi(this, 'graphqlEndpoint', {
            handler: graphQLYogaServer,
            defaultMethodOptions: {
                authorizationType: AuthorizationType.IAM
            }
        });

        new cdk.CfnOutput(this, 'BookReviewsApiArn', {
            value: reviewsApi.arnForExecuteApi("*", "/graphql", "prod"),
            exportName: 'BookReviewsApiArn'
        });

        new cdk.CfnOutput(this, 'BookReviewsApiEndpoint', {
            value: reviewsApi.url + "graphql",
            exportName: 'BookReviewsApiUrl'
        });
    }
}