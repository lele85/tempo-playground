# Grafana Tempo Minimal Example

This is a playground for grafana tempo. In this configuration we have a single binary tempo running locally with S3 storage (provided by minio).

How to start:

```
docker-compose up
```

Tempo is configured to have *only* the zipkin protocol receiver in http. Once the project is up and running you can push spans:

## Push manually spans through bash shell

```bash
curl -X POST http://localhost:9411 -H 'Content-Type: application/json' -d '[
    {
        "id": "1234",
        "traceId": "0123456789abcdea",
        "timestamp": 1608239395286533,
        "duration": 100000,
        "name": "span from bash!",
        "tags": {
            "http.method": "GET",
            "http.path": "/api"
        },
        "localEndpoint": {
            "serviceName": "shell script"
        }
    },
    {
        "id": "5678",
        "traceId": "0123456789abcdea",
        "parentId": "1234",
        "timestamp": 1608239395316533,
        "duration": 100000,
        "name": "child span from bash!",
        "localEndpoint": {
            "serviceName": "shell script"
        }
    }
]'
```

Then you can now take a look at the trace from the local grafana:

`http://localhost:3000/explore?orgId=1&left=%5B%22now-1h%22,%22now%22,%22Tempo%22,%7B%22query%22:%220123456789abcdea%22%7D%5D`

## Push spans from a nodejs script using opentelemetry sdk

```bash
node app/index.js
```

spans are printed to the `stdout` and pushed on `tempo`. To search for the spans in grafana grab the `traceId` from the `stdout`.

```js
{
  traceId: 'a0a5acd4a49bf42095864d23b0ea1703',
  parentId: undefined,
  name: 'main',
  id: 'deb2d2f5143cc04f',
  kind: 0,
  timestamp: 1618990755435259,
  duration: 1007957,
  attributes: {},
  status: { code: 0 },
  events: []
}
```