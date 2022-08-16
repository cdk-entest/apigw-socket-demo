#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { ApigwSocketStack } from "../lib/apigw-socket-stack";

const app = new cdk.App();
new ApigwSocketStack(app, "ApigwSocketStack", {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});
