import * as cdk from 'aws-cdk-lib';
import { BooksServiceApiStack } from '../lib/sourceApis/booksService/books-service-api-stack';
import { ReviewsServiceApiStack } from '../lib/sourceApis/reviewsService/reviews-service-api-stack';
import { AuthorsServiceApiStack } from '../lib/sourceApis/authorsService/authors-service-api-stack';
import { GraphQLGatewayStack } from '../lib/gateway-infrastructure/gateway-stack';

const app = new cdk.App();

const booksService = new BooksServiceApiStack(app, 'BooksServiceApi')

const reviewsService = new ReviewsServiceApiStack(app, 'ReviewsServiceApi')

const authorsService = new AuthorsServiceApiStack(app, 'AuthorsServiceApi')

const gatewayService = new GraphQLGatewayStack(app, 'GraphQLGateway');