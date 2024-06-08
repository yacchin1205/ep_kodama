FROM mcr.microsoft.com/devcontainers/typescript-node:18 AS build-stage

COPY . /app/ep_kodama
RUN cd /app/ep_kodama \
    && ls -la /app/ep_kodama \
    && npm i --include dev && npm run build

FROM etherpad/etherpad:2

USER root

COPY --from=build-stage /app/ep_kodama /tmp/ep_kodama

USER etherpad

ARG ETHERPAD_PLUGINS="ep_align ep_markdown ep_embedded_hyperlinks2 ep_font_color ep_headings2  ep_image_upload"
ARG ETHERPAD_LOCAL_PLUGINS="/tmp/ep_kodama/"
RUN bin/installDeps.sh && rm -rf ~/.npm && \
    if [ ! -z "${ETHERPAD_PLUGINS}" ]; then \
        pnpm run plugins i ${ETHERPAD_PLUGINS}; \
    fi && \
    if [ ! -z "${ETHERPAD_LOCAL_PLUGINS}" ]; then \
        pnpm run plugins i ${ETHERPAD_LOCAL_PLUGINS:+--path ${ETHERPAD_LOCAL_PLUGINS}}; \
    fi
RUN cd /opt/etherpad-lite/src && pnpm i "sharp@^0.33.4"
