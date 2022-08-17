"""
extract connection id and write to a table
"""
import os
import boto3

ddb = boto3.resource("dynamodb")
table = ddb.Table(os.environ["TABLE_NAME"])


def handler(event, context):
    """
    write connection id to a table
    """
    #
    print(event)
    #
    try:
        table.put_item(
            Item={"ConnectionId": event["requestContext"]["connectionId"]}
        )
    except:
        pass
    # return
    return {"statusCode": "200"}
