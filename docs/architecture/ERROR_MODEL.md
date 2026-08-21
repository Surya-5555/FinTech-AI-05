# Stable Error Model

All API errors return:
```json
{
  "error": {
    "code": "CODE",
    "message": "message",
    "correlationId": "uuid",
    "details": []
  }
}
```
