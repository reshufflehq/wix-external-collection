
const HIKE_SCHEMA = {
  "schemas": [
  {
    "displayName": "track",
    "id": "track",
    "allowedOperations":     [
      "get",
      "find",
      "count",
      "update",
      "insert",
      "remove"

    ],
    "maxPageSize": 50,
    "ttl": 3600,
    "fields":     {
      "_id":       {
        "displayName": "_id",
        "type": "text",
        "queryOperators":         [
          "eq",
          "lt",
          "gt",
          "hasSome",
          "and",
          "lte",
          "gte",
          "or",
          "not",
          "ne",
          "startsWith",
          "endsWith"
        ]
      },
      "_owner":       {
        "displayName": "_owner",
        "type": "text",
        "queryOperators":         [
          "eq",
          "lt",
          "gt",
          "hasSome",
          "and",
          "lte",
          "gte",
          "or",
          "not",
          "ne",
          "startsWith",
          "endsWith"
        ]
      },
      "name":       {
        "displayName": "name",
        "type": "text",
        "queryOperators":         [
          "eq",
          "lt",
          "gt",
          "hasSome",
          "and",
          "lte",
          "gte",
          "or",
          "not",
          "ne",
          "startsWith",
          "endsWith"
        ]
      },
      "distance":       {
        "displayName": "distance",
        "type": "number",
        "queryOperators":         [
          "eq",
          "lt",
          "gt",
          "and",
          "lte",
          "gte",
          "or",
          "not",
          "ne"
        ]
      },
      "completed_date":       {
        "displayName": "completed date",
        "type": "datetime",
        "queryOperators":         [
          "eq",
          "lt",
          "gt",
          "and",
          "lte",
          "gte",
          "or",
          "not",
          "ne"
        ]
      }
    }
  }
]}


module.exports = { HIKE_SCHEMA }