#!/bin/bash
set -e

# move to the infrastructure directory
cd infrastructure

# install dependencies
yarn install

# build .ts to .js for appsync apis
npm run build

# deploy with cdk, this will construct the appsync source api infrastructure
cdk deploy GraphQLGateway