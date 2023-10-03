import * as cdk from "aws-cdk-lib";
import {Construct} from "constructs";
import * as ecsPatterns from 'aws-cdk-lib/aws-ecs-patterns';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { DockerImageAsset, NetworkMode } from "aws-cdk-lib/aws-ecr-assets";
import * as path from "path";
import { Effect, PolicyStatement } from "aws-cdk-lib/aws-iam";
import { ApplicationProtocol } from "aws-cdk-lib/aws-elasticloadbalancingv2";
import { Certificate } from "aws-cdk-lib/aws-certificatemanager";
import { HostedZone } from "aws-cdk-lib/aws-route53";
import { CfnOutput } from "aws-cdk-lib/core";

export class GraphQLGatewayStack extends cdk.Stack {

    constructor(scope: Construct, id: string) {
        super(scope, id);

        // Create VPC and Fargate Cluster
        // NOTE: Limit AZs to avoid reaching resource quotas
        const vpc = new ec2.Vpc(this, 'MyVpc', { maxAzs: 2 });
        const cluster = new ecs.Cluster(this, 'Cluster', { vpc });

        const asset = new DockerImageAsset(this, 'MyBuildImage', {
            directory: path.join(__dirname, '../../../fusion-gateway/Gateway'),
            networkMode: NetworkMode.HOST,
        });

        let wildcardCertificate = null;
        let domainName = process.env.GRAPHQL_GATEWAY_DOMAIN_NAME;
        let domainZone = null;
        if (process.env.CERTIFICATE_ARN && process.env.GRAPHQL_GATEWAY_ZONE_ID && process.env.GRAPHQL_GATEWAY_ZONE_NAME) {
            domainZone = HostedZone.fromHostedZoneAttributes(this, 'HostedZone', {
                hostedZoneId: process.env.GRAPHQL_GATEWAY_ZONE_ID,
                zoneName: process.env.GRAPHQL_GATEWAY_ZONE_NAME,
            });

            wildcardCertificate = Certificate.fromCertificateArn(this, 'SSLCertificate', process.env.CERTIFICATE_ARN);
        }

        const protocol = wildcardCertificate != null ? ApplicationProtocol.HTTPS : ApplicationProtocol.HTTP;
        const service = new ecsPatterns.ApplicationLoadBalancedFargateService(this, 'GraphQLGatewayService', {
            cluster: cluster,
            memoryLimitMiB: 4096,
            cpu: 1024,
            desiredCount: 1,
            taskImageOptions: {
                image: ecs.ContainerImage.fromDockerImageAsset(asset),
            },
            protocol: protocol,
            certificate: wildcardCertificate != null ? wildcardCertificate : undefined,
            domainName: domainName,
            domainZone: domainZone != null ? domainZone : undefined,
        });

        const reviewsServiceApiArn = cdk.Fn.importValue('BookReviewsApiArn'); 
        const authorsServiceApiArn = cdk.Fn.importValue('AuthorsApiArn');
        const booksServiceApiArn = cdk.Fn.importValue('BooksApiArn');

        service.taskDefinition.taskRole.addToPrincipalPolicy(new PolicyStatement({
            effect: Effect.ALLOW,
            actions: ['execute-api:Invoke'],
            resources: [reviewsServiceApiArn]
        }));

        service.taskDefinition.taskRole.addToPrincipalPolicy(new PolicyStatement({
            effect: Effect.ALLOW,
            actions: ['appsync:GraphQL'],
            resources: [booksServiceApiArn + "/*", authorsServiceApiArn + "/*"]
        }));


        domainName = domainName ?? service.loadBalancer.loadBalancerDnsName;
        new CfnOutput(this, 'GraphQLGatewayEndpoint', {
            exportName: 'GraphQLGatewayEndpoint',
            value: protocol.toLowerCase() + '://' + domainName + "/graphql"
        });
    }
}