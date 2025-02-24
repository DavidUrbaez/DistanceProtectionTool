FROM node:18-alpine

WORKDIR /app

RUN apk add --no-cache \
    git \
    make \
    g++ \
    python3

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]