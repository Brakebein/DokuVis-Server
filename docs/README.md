# API Documentation

Documentation according to **[OpenAPI Specification](https://github.com/OAI/OpenAPI-Specification) v3.0.2**

Validate OpenAPI files

    npm install -g swagger-cli

    swagger-cli validate openapi.yaml

Generate API Reference website ([ReDoc](https://github.com/Rebilly/ReDoc))

    npm install -g redoc

    redoc-cli bundle -o index.html openapi.yaml