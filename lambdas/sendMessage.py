"""
get endpoint url by 
1. query the stack 
2. sys parameter store
"""
import os
import json
import boto3

# api managment
client = boto3.client(
    "apigatewaymanagementapi", endpoint_url=os.environ["ENDPOINT_URL"]
)
# table
ddb = boto3.resource("dynamodb")
table = ddb.Table(os.environ["TABLE_NAME"])


def handler(event, context):
    """
    send back message to a clientid
    """
    # scan connection ids
    connectionIds = []
    try:
        response = table.scan()
        items = response["Items"]
        print(items)
        for item in items:
            connectionIds.append(item["ConnectionId"])
        print(connectionIds)
    except:
        pass
    # broadcast message to all ids
    for id in connectionIds:
        response_message = "response message from lambda..."
        client.post_to_connection(
            Data=json.dumps(response_message), ConnectionId=id
        )

    return {"statusCode": 200}


if __name__ == "__main__":
    handler(event={}, context=None)
