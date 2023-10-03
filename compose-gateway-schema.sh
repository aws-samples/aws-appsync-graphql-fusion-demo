#!/bin/bash
set -e

get_api_url() {
    echo $(aws cloudformation list-exports --query "Exports[?Name==\`$1\`].Value" --no-paginate --output text)
}

put_subgraph_config() {
    apiUrl=$(get_api_url $1)
    echo "{\"subgraph\": \"$2\", \"http\": { \"baseAddress\": \"$apiUrl\", \"clientName\": \"$4\" }}" > $3
}

compose_subgraph() {
    put_subgraph_config $1 $2 $3/subgraph-config.json $4
    dotnet fusion subgraph pack -w $3
    dotnet fusion compose -p ./fusion-gateway/Gateway/gateway.fgp -s $3
}

dotnet tool restore

compose_subgraph "AuthorsApiUrl" "Authors" "./infrastructure/lib/sourceApis/authorsService" "AppSync"

compose_subgraph "BooksApiUrl" "Books" "./infrastructure/lib/sourceApis/booksService" "AppSync"

compose_subgraph "BookReviewsApiUrl" "Reviews" "./infrastructure/lib/sourceApis/reviewsService" "ApiGateway"