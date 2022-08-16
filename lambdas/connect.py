"""
extract connection id and write to a table
"""


def handler(event, context):
    """
    write connection id to a table
    """
    print(event)

    return {"statusCode": "200"}
