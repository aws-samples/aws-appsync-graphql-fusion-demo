import { APIGatewayEvent, APIGatewayProxyResult, Context } from 'aws-lambda'
import { createGraphQLError, createSchema, createYoga } from 'graphql-yoga'
import * as fs from 'fs'
import * as path from 'path'
import { DocumentClient } from 'aws-sdk/clients/dynamodb';
import { v4 as uuidv4 } from 'uuid';

const dynamoDB = new DocumentClient();
const REVIEW_TABLE_NAME = "BookReviewsTable"

interface Review {
  id: string,
  bookId: string,
  authorId: string,
  comment: string,
  rating: number
}

interface ReviewConnection {
  items?: [Review]
  nextToken?: string,
}

interface Author {
  id: string,
  reviews: ReviewConnection
}

interface Book {
  id: string,
  reviews: ReviewConnection
}
 
const yoga = createYoga<{
  event: APIGatewayEvent
  lambdaContext: Context
}>({
  graphqlEndpoint: '/graphql',
  schema: createSchema({
    typeDefs: fs.readFileSync(path.join(__dirname, 'schema.graphql'), 'utf-8'),
    resolvers: {
      Query: {       
        reviewById(_: any, { id }: any) {
          return getReviewById(id);
        },
        reviews(_: any, { limit }: any) {
          return getReviews(limit);
        },
        bookById(_: any, { id }: any) {
          return getBookById(id);
        },
        authorById(_: any, { id }: any) {
          return getAuthorById(id);
        },
      },
      Mutation: {
        createReview(_:any, { input }: any) {
          return createReview(input);
        },
        deleteReview(_: any, { input }: any) {
          return deleteReview(input);
        }
      }
    }
  })
})
 
export async function handler(
  event: APIGatewayEvent,
  lambdaContext: Context
): Promise<APIGatewayProxyResult> {
  const response = await yoga.fetch(
    event.path +
      '?' +
      new URLSearchParams((event.queryStringParameters as Record<string, string>) || {}).toString(),
    {
      method: event.httpMethod,
      headers: event.headers as HeadersInit,
      body: event.body
        ? Buffer.from(event.body, event.isBase64Encoded ? 'base64' : 'utf8')
        : undefined
    },
    {
      event,
      lambdaContext
    }
  )

  console.log(response.statusText);
 
  const responseHeaders = Object.fromEntries(response.headers.entries())
 
  return {
    statusCode: response.status,
    headers: responseHeaders,
    body: await response.text(),
    isBase64Encoded: false
  }
}

async function getReviewById(id: any): Promise<Review | undefined> {
  const params = {
    TableName: REVIEW_TABLE_NAME,
    Key: {
      id: id,
    },
  };

   try {
      const data = await dynamoDB.get(params).promise();
      if (!data.Item) {
        return undefined;
      }

      return data.Item as Review;
   } catch (error: any) {
      console.error('Error fetching review from DynamoDB:', error);
      throw createGraphQLError(error.message);
   }
}

async function getReviews(limit?: number): Promise<ReviewConnection | undefined> {
    const params = {
      TableName: REVIEW_TABLE_NAME,
      Limit: limit ?? undefined
    };

  try {
      const data = await dynamoDB.scan(params).promise();
      if (!data.Items) {
        return undefined;
      }

      return {
        items: data.Items as [Review]
      };
  } catch (error: any) {
      console.error('Error fetching reviews from DynamoDB:', error);
      throw createGraphQLError(error.message);
  }
}

async function getAuthorById(id: any): Promise<Author | undefined> {
  const params = {
    TableName: REVIEW_TABLE_NAME,
    KeyConditionExpression: 'authorId = :authorId',
    ExpressionAttributeValues: {
      ':authorId': id,
    },
    IndexName: 'review-author-index',
    Limit: 25
  };

  return queryReviews(id, params);
}

async function getBookById(id: any): Promise<Book | undefined> {
  const params = {
    TableName: REVIEW_TABLE_NAME,
    KeyConditionExpression: 'bookId = :bookId',
    ExpressionAttributeValues: {
      ':bookId': id,
    },
    IndexName: 'review-book-index',
    Limit: 25
  };

  return queryReviews(id, params);
}

async function createReview(input: any): Promise<Review> {
  const reviewId = uuidv4();

  const review: Review = {
    id: reviewId,
    ...input,
  };

  const params = {
    Put: {
      TableName: REVIEW_TABLE_NAME,
      Item: {
        ...review,
      },
    },
  };

  
  try {
    await dynamoDB.transactWrite({ TransactItems: [params] }).promise();
    return review;
  } catch (error: any) {
    console.error('Error adding review in DynamoDB:', error);
    console.error('Cancellation reason:', error.CancellationReasons[0])
    throw createGraphQLError(error.message);
  }
}

async function deleteReview(input: any) {
  const params = {
    Delete: {
      TableName: REVIEW_TABLE_NAME,
      Key: {
        ...input
      },
    }
  };

  try {
    await dynamoDB.transactWrite({ TransactItems: [params] }).promise();
    return {
      ...input
    }
  } catch (error: any) {
    console.error('Error deleting review in DynamoDB: ', error);
    throw createGraphQLError(error.message);
  }
}

async function queryReviews(id: any, params: DocumentClient.QueryInput) {
  try {
    const data = await dynamoDB.query(params).promise();
    if (!data.Items) {
      return undefined;
    }

    return {
      id: id,
      reviews: {
        items: data.Items as [Review],
        nextToken: data.LastEvaluatedKey ? data.LastEvaluatedKey.id : undefined
      }
    }
  } catch (error: any) {
    console.error('Error querying reviews from DynamoDB:', error);
    throw createGraphQLError(error.message);
  }
}

