# assist-pc-backend

## Docker Commands

### Using Docker Compose (Recommended)

#### Run the application with PostgreSQL
```bash
docker-compose up -d
```

#### Stop the application
```bash
docker-compose down
```

#### View logs
```bash
docker-compose logs -f
```

#### Rebuild and restart
```bash
docker-compose up --build -d
```

### Using Docker directly

#### Build the Docker image
```bash
docker build -t sage-backend .
```

#### Run the container
```bash
docker run -p 3000:3000 sage-backend
```

#### Run in development mode (with volume mounting)
```bash
docker run -p 3000:3000 -v $(pwd):/usr/src/app -v /usr/src/app/node_modules sage-backend
```