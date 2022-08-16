import {
  aws_apigatewayv2,
  aws_dynamodb,
  aws_iam,
  aws_lambda,
  CfnOutput,
  Duration,
  RemovalPolicy,
  Stack,
  StackProps,
} from "aws-cdk-lib";
import { Effect } from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";
import * as path from "path";

export class ApigwSocketStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // apigw socket
    const api = new aws_apigatewayv2.CfnApi(this, "ApiGwSocket", {
      name: "HelloApiGwSocket",
      protocolType: "WEBSOCKET",
      routeSelectionExpression: "$request.body.action",
    });

    // table
    const table = new aws_dynamodb.Table(this, "ConnectionIdTable", {
      tableName: "ConnectionIdTable",
      partitionKey: {
        name: "ConnectionId",
        type: aws_dynamodb.AttributeType.STRING,
      },
      readCapacity: 5,
      writeCapacity: 5,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    // connect function
    const connectFunc = new aws_lambda.Function(this, "ConnectFunc", {
      functionName: "ConnectFunc",
      code: aws_lambda.Code.fromAsset(path.join(__dirname, "./../lambdas")),
      handler: "connect.handler",
      runtime: aws_lambda.Runtime.PYTHON_3_8,
      timeout: Duration.seconds(300),
      memorySize: 256,
      environment: {
        TABLE_NAME: table.tableName,
      },
    });

    table.grantReadWriteData(connectFunc);

    // disconnect function
    const disconnectFunc = new aws_lambda.Function(this, "DisconnectFunc", {
      functionName: "DisconnectFunc",
      code: aws_lambda.Code.fromAsset(path.join(__dirname, "./../lambdas")),
      handler: "disconnect.handler",
      runtime: aws_lambda.Runtime.PYTHON_3_8,
      timeout: Duration.seconds(300),
      memorySize: 256,
      environment: {
        TABLE_NAME: table.tableName,
      },
    });

    table.grantReadWriteData(disconnectFunc);

    // message function
    const messageFunc = new aws_lambda.Function(this, "MessageFunc", {
      functionName: "MessageFunc",
      code: aws_lambda.Code.fromAsset(path.join(__dirname, "./../lambdas")),
      handler: "sendMessage.handler",
      runtime: aws_lambda.Runtime.PYTHON_3_8,
      timeout: Duration.seconds(300),
      memorySize: 256,
      environment: {
        TABLE_NAME: table.tableName,
        ENDPOINT_URL: `https://${api.ref}.execute-api.${this.region}.amazonaws.com/dev`,
      },
      initialPolicy: [
        new aws_iam.PolicyStatement({
          effect: Effect.ALLOW,
          actions: ["execute-api:ManageConnections"],
          resources: ["*"],
        }),
      ],
    });

    table.grantReadWriteData(messageFunc);

    // access role for socket api to access the socket lambda
    const role = new aws_iam.Role(this, "RoleForApiGwInvokeLambda", {
      roleName: "InvokeLambdaRoleForApiGw",
      assumedBy: new aws_iam.ServicePrincipal("apigateway.amazonaws.com"),
    });

    role.addToPolicy(
      new aws_iam.PolicyStatement({
        effect: Effect.ALLOW,
        resources: [
          connectFunc.functionArn,
          disconnectFunc.functionArn,
          messageFunc.functionArn,
        ],
        actions: ["lambda:InvokeFunction"],
      })
    );

    // lambda integration and routes
    const connectIntegration = new aws_apigatewayv2.CfnIntegration(
      this,
      "ConnectLambdaIntegration",
      {
        apiId: api.ref,
        integrationType: "AWS_PROXY",
        integrationUri: `arn:aws:apigateway:${this.region}:lambda:path/2015-03-31/functions/${connectFunc.functionArn}/invocations`,
        credentialsArn: role.roleArn,
      }
    );

    const disconnectIntegration = new aws_apigatewayv2.CfnIntegration(
      this,
      "DisconnectLambdaIntegration",
      {
        apiId: api.ref,
        integrationType: "AWS_PROXY",
        integrationUri: `arn:aws:apigateway:${this.region}:lambda:path/2015-03-31/functions/${disconnectFunc.functionArn}/invocations`,
        credentialsArn: role.roleArn,
      }
    );

    const messageIntegration = new aws_apigatewayv2.CfnIntegration(
      this,
      "MessageLambdaIntegration",
      {
        apiId: api.ref,
        integrationType: "AWS_PROXY",
        integrationUri: `arn:aws:apigateway:${this.region}:lambda:path/2015-03-31/functions/${messageFunc.functionArn}/invocations`,
        credentialsArn: role.roleArn,
      }
    );

    const connectRoute = new aws_apigatewayv2.CfnRoute(this, "ConnectRoute", {
      apiId: api.ref,
      routeKey: "$connect",
      authorizationType: "NONE",
      target: "integrations/" + connectIntegration.ref,
    });

    const disconnectRoute = new aws_apigatewayv2.CfnRoute(
      this,
      "DisconnectRoute",
      {
        apiId: api.ref,
        routeKey: "$disconnect",
        authorizationType: "NONE",
        target: "integrations/" + disconnectIntegration.ref,
      }
    );
    const messageRoute = new aws_apigatewayv2.CfnRoute(this, "MessageRoute", {
      apiId: api.ref,
      routeKey: "sendmessage",
      authorizationType: "NONE",
      target: "integrations/" + messageIntegration.ref,
    });

    // deployment and stage
    const deployment = new aws_apigatewayv2.CfnDeployment(this, "deployment", {
      apiId: api.ref,
    });

    new aws_apigatewayv2.CfnStage(this, "DevStage", {
      stageName: "dev",
      deploymentId: deployment.ref,
      apiId: api.ref,
      autoDeploy: true,
    });

    deployment.node.addDependency(connectRoute);
    deployment.node.addDependency(disconnectRoute);
    deployment.node.addDependency(messageRoute);

    new CfnOutput(this, "endpointUrl", {
      exportName: "apiId",
      value: api.ref,
    });
  }
}
