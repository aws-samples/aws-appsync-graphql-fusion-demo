
### AppSync + GraphQL Fusion

This sample shows how to integrate AWS AppSync APIs as subgraphs within a GraphQL-Fusion Gateway. [GraphQL-Fusion](https://chillicream.com/blog/2023/08/15/graphql-fusion) is a new effort in the community to create a specification under the MIT license for combining multiple GraphQL schemas through a distributed GraphQL gateway. The gateway server can combine data from any GraphQL endpoint, regardless of the technology used to run the backend subgraph. This sample uses Hot Chocolate Fusion, an early implementation of the GraphQL-Fusion spec, to distribute requests across the different source APIs. The sample creates three subgraphs:

1. Authors Service - AppSync endpoint subgraph
2. Books Service - AppSync endpoint subgraph
3. Reviews Service - API GW + Lambda integration using [GraphQL Yoga](https://the-guild.dev/graphql/yoga-server), a popular open source graphql server.

The three subgraphs are composed into the Fusion gateway which is ran as a Fargate service behind an Application Load Balancer.

### Architecture

![GraphQL-Fusion Gateway Sample Architecture](/images/FusionGateway.png)

### Deployment Prerequisites

1. The sample requires the [AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html) to be installed.
2. The sample requires [.NET 8.0 version 8.0.100-preview.7](https://dotnet.microsoft.com/en-us/download/dotnet/8.0)
3. The sample requires that you have [Docker](https://docs.docker.com/desktop/) installed.
4. The sample requires that you have the [AWS CDK](https://docs.aws.amazon.com/cdk/v2/guide/getting_started.html) installed.

### Security Note

:warning: *This is a project built for demo purpose and is not meant for production use.*

This sample creates a public HTTP endpoint. In order to use HTTPS, you can optional configure the deployment of the GraphQL Gateway to use a public domain name and ACM certificate using environment variables.
If the variables are present, the gateway endpoint will require that requests use HTTPS.

```
export GRAPHQL_GATEWAY_DOMAIN_NAME='<your registered domain name>'
export GRAPHQL_GATEWAY_ZONE_ID='<your public hosted zone id>'
export GRAPHQL_GATEWAY_ZONE_NAME='<your public hosted zone name>'
export CERTIFICATE_ARN='<your ACM certificate arn>'
```

The sample does not implement authentication at the gateway level. In order to add authentication, you can uncomment the code in fusion-gateway/Gateway/Program.cs and specify an open id provider or 
add any additional authentication scheme following the [ASP.NET Core Authentication Documentation](https://learn.microsoft.com/en-us/aspnet/core/security/authentication/?view=aspnetcore-8.0)

### Deploying the Sample

1. Setup your AWS Credentials as Environment Variables

```
export AWS_ACCESS_KEY_ID=<YOUR AWS ACCESS KEY ID>
export AWS_SECRET_ACCESS_KEY=<YOUR AWS SECRET KEY>
export AWS_SESSION_TOKEN=<YOUR AWS SESSION TOKEN>
export AWS_REGION=us-west-2
```

2. Deploy the Source subgraphs

```
./deploy-subgraphs.sh
```

3. Compose the Fusion Gateway using the Subgraph Schemas
```
./compose-gateway-schema.sh
```

4. Run the Fusion Gateway

```
./deploy-fusion-gateway.sh
```

### Testing the Sample

Once the gateway has been deployed, you can access it at the endpoint url that is created for the load balancer. Navigating to the ALB endpoint + "/graphql" in a browser such as Chrome will bring up the Banana Cake Pop GraphQL IDE.

1. Add a sample author

```
mutation createAuthor {
    createAuthor(input: {
        name: "Mark Twain",
        bio: "Mark Twain was an American humorist, journalist, lecturer, and novelist",
        contactEmail: "markTwain@example.com",
        nationality: "USA"
    }) {
        id,
        bio,
        contactEmail,
        nationality
    }
}


Sample Response:
{
  "data": {
    "createAuthor": {
      "id": "bab29018-c276-4636-840e-099e227e634f",
      "bio": "Mark Twain was an American humorist, journalist, lecturer, and novelist",
      "contactEmail": "markTwain@example.com",
      "nationality": "USA"
    }
  }
}
```

2. Add a sample book from this author using id from above step.

```
mutation createBook {
    createBook(input: {
        title: "The Adventures of Tom Sawyer",
        authorId: "bab29018-c276-4636-840e-099e227e634f",
        genre: "Adventure Fiction",
        publicationYear: 1876,
    }) {
        id,
        title,
        authorId,
        genre,
        publicationYear
    }
}


Sample Response:
{
  "data": {
    "createBook": {
      "id": "6490e420-a375-49a4-bb5b-1c9540e70add",
      "title": "The Adventures of Tom Sawyer",
      "authorId": "bab29018-c276-4636-840e-099e227e634f",
      "genre": "Adventure Fiction",
      "publicationYear": 1876
    }
  }
}
```

3. Add a sample review for this book using the generated book id and author id.

```
mutation createReview {
    createReview(input: {
        authorId: "bab29018-c276-4636-840e-099e227e634f",
        bookId: "6490e420-a375-49a4-bb5b-1c9540e70add",
        comment: "This is a great American novel about the mischievous adventures of a boy named Tom Sawyer",
        rating: 8
    }) {
        id,
        authorId,
        bookId,
        comment,
        rating
    }
}


Sample Response:
{
  "data": {
    "createReview": {
      "id": "2d07d856-522f-4259-9848-0a67a14929fd",
      "authorId": "bab29018-c276-4636-840e-099e227e634f",
      "bookId": "6490e420-a375-49a4-bb5b-1c9540e70add",
      "comment": "This is a great American novel about the mischievous adventures of a boy named Tom Sawyer",
      "rating": 8
    }
  }
}
```

4. Test your Gateway endpoint using a query. The following query will retrieve data from all 3 subgraphs:

```
query GetBookData {
    bookById(id: "6490e420-a375-49a4-bb5b-1c9540e70add") {
        id,
        title,
        publicationYear,
        genre,
        author {
        id,
        name,
        bio,
        nationality
        },
        reviews {
        items {
            id,
            rating,
            comment
        }
        }
    }
}

Sample response:
{
  "data": {
    "bookById": {
      "id": "6490e420-a375-49a4-bb5b-1c9540e70add",
      "title": "The Adventures of Tom Sawyer",
      "publicationYear": 1876,
      "genre": "Adventure Fiction",
      "author": {
        "id": "bab29018-c276-4636-840e-099e227e634f",
        "name": "Mark Twain",
        "bio": "Mark Twain was an American humorist, journalist, lecturer, and novelist",
        "nationality": "USA"
      },
      "reviews": {
        "items": [
          {
            "id": "2d07d856-522f-4259-9848-0a67a14929fd",
            "rating": 8,
            "comment": "This is a great American novel about the mischievous adventures of a boy named Tom Sawyer."
          }
        ]
      }
    }
  }
}

```

4. Cleanup the Sample

```
./cleanup-infrastructure.sh
```
