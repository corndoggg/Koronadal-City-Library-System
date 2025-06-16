FROM node:18

WORKDIR /app

COPY . .

RUN npm install && npm run build && npm install -g serve

EXPOSE 3000

CMD ["serve", "-s", "dist", "-l", "3000"]