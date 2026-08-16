FROM node:18-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    python3 \
    python3-pip \
    curl \
    ca-certificates \
    unzip \
    && rm -rf /var/lib/apt/lists/*

RUN curl -fsSL https://github.com/denoland/deno/releases/latest/download/deno-x86_64-unknown-linux-gnu.zip -o /tmp/deno.zip \
    && unzip /tmp/deno.zip -d /usr/local/bin \
    && chmod +x /usr/local/bin/deno \
    && deno --version \
    && rm /tmp/deno.zip

RUN curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp \
    && chmod a+rx /usr/local/bin/yt-dlp \
    && yt-dlp --version

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

RUN mkdir -p /tmp/audio_workdir /app/tools

ENV NODE_ENV=production
ENV TMPDIR=/tmp/audio_workdir
ENV DENO_INSTALL=/usr/local/bin
ENV PATH=/usr/local/bin:$PATH

EXPOSE 3000

CMD ["node", "src/server.js"]
