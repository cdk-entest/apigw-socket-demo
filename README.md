---
title: Api Gateway Socket
description: Just show a simple setup with api gateway socket
author: haimtran
publishedDate: 08/14/2022
date: 2022-08-14
---

## Introduction

Setup and go through basic concepts of apigw socket

- Routes: $connect, $disconnect, $default, $sendMessage
- Role for apigw, and role for lambda
- SendMessage lambda get the endpointUrl and send messages back to clients
- Manage connectionId by a table

## Api Socket

create an api socket, skip deploy options

```tsx
const api = new aws_apigatewayv2.CfnApi(this, "ApiGwSocket", {
  name: "HelloApiGwSocket",
  protocolType: "WEBSOCKET",
  routeSelectionExpression: "$request.body.action",
});
```

role for apigw

```tsx
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
```

create a table for connection ids

```tsx
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
```

connect, disconnect handler

```tsx
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
table.grantReadWriteData(messageFunc);
```

send message handler which send messages back to clients

```tsx
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
```

## Lambda Integration

Use proxy integration between lambda and apigw

```tsx
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
```

then create routes

```tsx
const connectRoute = new aws_apigatewayv2.CfnRoute(this, "ConnectRoute", {
  apiId: api.ref,
  routeKey: "$connect",
  authorizationType: "NONE",
  target: "integrations/" + connectIntegration.ref,
});

const disconnectRoute = new aws_apigatewayv2.CfnRoute(this, "DisconnectRoute", {
  apiId: api.ref,
  routeKey: "$disconnect",
  authorizationType: "NONE",
  target: "integrations/" + disconnectIntegration.ref,
});
const messageRoute = new aws_apigatewayv2.CfnRoute(this, "MessageRoute", {
  apiId: api.ref,
  routeKey: "sendmessage",
  authorizationType: "NONE",
  target: "integrations/" + messageIntegration.ref,
});
```

## Deployment and Stage

```tsx
const deployment = new aws_apigatewayv2.CfnDeployment(this, "deployment", {
  apiId: api.ref,
});

new aws_apigatewayv2.CfnStage(this, "DevStage", {
  stageName: "dev",
  deploymentId: deployment.ref,
  apiId: api.ref,
  autoDeploy: true,
});
```

dependency and export output

```tsx
deployment.node.addDependency(connectRoute);
deployment.node.addDependency(disconnectRoute);
deployment.node.addDependency(messageRoute);

new CfnOutput(this, "endpointUrl", {
  exportName: "apiId",
  value: api.ref,
});
```

## Test

message format sent from client

```json
{ "action": "sendmessage", "message": "hello hai tran" }
```

Just using online testing tool [here](https://www.piesocket.com/)
