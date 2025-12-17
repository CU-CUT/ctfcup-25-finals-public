ARG PYTHON_VERSION=3.11.13
FROM python:${PYTHON_VERSION}-slim as base

ARG WEBHOOK_PORT=8080

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

ARG UID=10001
RUN adduser \
    --disabled-password \
    --gecos "" \
    --home "/nonexistent" \
    --shell "/sbin/nologin" \
    --no-create-home \
    --uid "${UID}" \
    bot

RUN --mount=type=cache,target=/root/.cache/pip \
    --mount=type=bind,source=./bot/requirements.txt,target=requirements.txt \
    python -m pip install -r requirements.txt

USER bot

COPY ./bot  /app
COPY ./db /app/db

EXPOSE ${WEBHOOK_PORT}

CMD python bot.py