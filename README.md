# Power Outage Bot

## Development process

### Install packages

```
npm install
```

### Run dev server

```
npm run nodemon
```


## Deploy process

### 1. Publish new docker image if needed

```
npm run publish
```

### 2. Upload files from deploy folder to the server

### 3. Change following data in configuration files if needed

```
DOMAIN_NAME=power-outage-bot.artemtrush.com
TELEGRAM_BOT_TOKEN=***
```

### 4. Generate ssl certificates. They will be renewed automatically

```
chmod +x init-letsencrypt.sh

./init-letsencrypt.sh
```

### 5. Start docker containers

```
docker-compose up -d
```
