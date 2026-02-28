FROM node:20-bookworm-slim


RUN apt-get update && apt-get install -y \

    openjdk-17-jdk-headless \

    curl \

    bash \

    && curl -L https://github.com/clojure/brew-install/releases/latest/download/linux-install.sh | bash \

    && rm -rf /var/lib/apt/lists/*


WORKDIR /app


COPY package.json package-lock.json ./

COPY packages/ ./packages/


RUN npm ci


COPY . .


# shadow-cljs release usually needs to fetch dependencies first

RUN npx shadow-cljs release app


RUN npx vite build


FROM nginx:stable-alpine

# Using absolute path from the build stage
#COPY --from=0 /app/resources/public /usr/share/nginx/html
COPY --from=0 /app/resources/public/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
