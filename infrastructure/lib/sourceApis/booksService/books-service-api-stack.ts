import * as cdk from "aws-cdk-lib";
import * as path from "path";
import {Construct} from "constructs";
import {
    AuthorizationType,
    BaseDataSource,
    Code,
    DynamoDbDataSource,
    FunctionRuntime,
    GraphqlApi,
    Resolver,
    SchemaFile
} from "aws-cdk-lib/aws-appsync";
import {AttributeType, Table} from "aws-cdk-lib/aws-dynamodb";

export class BooksServiceApiStack extends cdk.Stack {
    public readonly booksApi: GraphqlApi;
    private booksDatasource: BaseDataSource;

    constructor(scope: Construct, id: string) {
        super(scope, id);

        const schema = SchemaFile.fromAsset(path.join(__dirname, 'schema.graphql'));
        this.booksApi = new GraphqlApi(this, `BooksServiceApi`, {
            name: `Books-Service`,
            schema: schema,
            authorizationConfig: {
                defaultAuthorization: {
                    authorizationType: AuthorizationType.IAM
                }
            }
        });

        const booksTable = new Table(this, `BooksDDBTable`, {
            partitionKey: {
                name: 'id',
                type: AttributeType.STRING
            },
            tableName: `BooksTable`,
        });

        booksTable.addGlobalSecondaryIndex({
            partitionKey: {
                name: 'authorId',
                type: AttributeType.STRING
            },
            indexName: 'book-author-index'
        });

        booksTable.addGlobalSecondaryIndex({
            partitionKey: {
                name: 'publisherId',
                type: AttributeType.STRING
            },
            indexName: 'book-publisher-index'
        });

        this.booksDatasource = new DynamoDbDataSource(this, `BooksDatasource`, {
            api: this.booksApi,
            table: booksTable
        });

        // Mutation to add a book in the datasource
        this.addJSUnitResolver(`CreateBookResolver`, "Mutation", "createBook", "createBook")

        // Mutation to delete a book from the datasource
        this.addJSUnitResolver(`DeleteBookResolver`, "Mutation", "deleteBook", "deleteBook")

        // Query to get book by id
        this.addJSUnitResolver(`GetBookResolver`, "Query", "bookById", "bookById")

        // Query to list all books in the datasource
        this.addJSUnitResolver(`ListBooksResolver`, "Query", "books", "books")

        // Query to join book data with the author data to return data about all books a given author has written.
        this.addJSUnitResolver(`GetBooksForAuthorResolver`, "Query", "authorById", "authorById")

        new cdk.CfnOutput(this, 'BooksApiArn', {
            value: this.booksApi.arn,
            exportName: 'BooksApiArn'
        });

        new cdk.CfnOutput(this, 'BooksApiEndpoint', {
            value: this.booksApi.graphqlUrl,
            exportName: 'BooksApiUrl'
        })
    }

    addJSUnitResolver(id: string,
                      typeName: string,
                      fieldName: string,
                      fileName: string) {
        new Resolver(this, id, {
            api: this.booksApi,
            fieldName: fieldName,
            typeName: typeName,
            dataSource: this.booksDatasource,
            code: Code.fromAsset(path.join(__dirname, `resolverCode/${fileName}.js`)),
            runtime: FunctionRuntime.JS_1_0_0
        });
    }
}