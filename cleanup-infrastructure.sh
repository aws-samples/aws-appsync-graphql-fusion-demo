#!/bin/bash
set -e

# Set region for all configs, remove or change to specify different
export AWS_REGION=us-west-2

# move to the infrastructure directory
cd infrastructure

# install dependencies
yarn install

# build .ts to .js for appsync apis
npm run build

cdk destroy --all
