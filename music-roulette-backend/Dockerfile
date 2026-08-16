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

RUN curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp \
    && chmod a+rx /usr/local/bin/yt-dlp \
    && yt-dlp --version

RUN curl -fsSL https://deno.land/install.sh | sh \
    && DENO_INSTALL="/root/.deno" \
    && echo "export DENO_INSTALL=$DENO_INSTALL" >> /etc/profile \
    && echo "export PATH=$DENO_INSTALL/bin:\$PATH" >> /etc/profile

ENV DENO_INSTALL=/root/.deno
ENV PATH=/root/.deno/bin:$PATH

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

RUN mkdir -p /tmp/audio_workdir /app/tools

ENV NODE_ENV=production
ENV TMPDIR=/tmp/audio_workdir

EXPOSE 3000

CMD ["node", "src/server.js"]
