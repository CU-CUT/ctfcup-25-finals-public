FROM aiogram/telegram-bot-api:9.2

ARG SSH_USER_USERNAME

RUN adduser -D -s /bin/bash bot

USER root

RUN --mount=type=secret,id=ssh_user_password \
    adduser -D -s /bin/bash "$SSH_USER_USERNAME" && \
    printf '%s:%s\n' "$SSH_USER_USERNAME" "$(cat /run/secrets/ssh_user_password)" | chpasswd