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
import {AttributeType, Table} from "aws-cdk-lib/aws-dynamodb";;

export class AuthorsServiceApiStack extends cdk.Stack {
    private authorsDatasource: BaseDataSource;
    public readonly authorsApi: GraphqlApi;

    constructor(scope: Construct, id: string) {
        super(scope, id);
        const schema = SchemaFile.fromAsset(path.join(__dirname, 'schema.graphql'));
        this.authorsApi = new GraphqlApi(this, 'AuthorsServiceApi', {
            name: `Authors-Service`,
            schema: schema,
            authorizationConfig: {
                defaultAuthorization: {
                    authorizationType: AuthorizationType.IAM
                }
            }
        });

        const authorsTable = new Table(this, 'AuthorsDDBTable', {
            partitionKey: {
                name: 'id',
                type: AttributeType.STRING
            },
            tableName: `AuthorsTable`,
        });

        this.authorsDatasource = new DynamoDbDataSource(this, 'AuthorsDatasource', {
            api: this.authorsApi,
            table: authorsTable
        });

        // Mutation to add an author in the datasource
        this.addJSUnitResolver('CreateAuthorResolver', "Mutation", "createAuthor", "createAuthor")

        // Mutation to delete an author from the datasource
        this.addJSUnitResolver('DeleteAuthorResolver', "Mutation", "deleteAuthor", "deleteAuthor")

        // Query to get author by id
        this.addJSUnitResolver('GetAuthorResolver', "Query", "authorById", "authorById")

        // Query to list all authors in the datasource
        this.addJSUnitResolver('ListAuthorsResolver', "Query", "authors", "authors")

        this.addJSUnitResolver('AuthorForBookResolver', "Query", "bookByAuthorId", "bookByAuthorId")

        new cdk.CfnOutput(this, 'AuthorsApiArn', {
            value: this.authorsApi.arn,
            exportName: 'AuthorsApiArn'
        });

        new cdk.CfnOutput(this, 'AuthorsApiEndpoint', {
            value: this.authorsApi.graphqlUrl,
            exportName: 'AuthorsApiUrl'
        })
    }

    addJSUnitResolver(id: string,
                      typeName: string,
                      fieldName: string,
                      fileName: string) {
        new Resolver(this, id, {
            api: this.authorsApi,
            fieldName: fieldName,
            typeName: typeName,
            dataSource: this.authorsDatasource,
            code: Code.fromAsset(path.join(__dirname, `resolverCode/${fileName}.js`)),
            runtime: FunctionRuntime.JS_1_0_0
        });
    }
}