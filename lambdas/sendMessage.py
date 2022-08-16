"""
get endpoint url by 
1. query the stack 
2. sys parameter store
"""
import json
import os
import boto3


def handler(event, context):
    """
    send back message to a clientid
    """
    # get endpoint url
    # endpoint_url = (
    #     f'{event["requestContext"]["domainName"]/{event["requestContext"]["stage"]}}'
    # )
    # TODO: get endpoint from outside function
    client = boto3.client(
        "apigatewaymanagementapi", endpoint_url=os.environ["ENDPOINT_URL"]
    )
    # get connection id
    connection_id = event["requestContext"]["connectionId"]
    # response message
    response_message = "response from lambda backend ..."
    # send response message to client
    client.post_to_connection(
        Data=json.dumps(response_message), ConnectionId=connection_id
    )
    return {"statusCode": 200}
