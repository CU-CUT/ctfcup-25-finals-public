ARG PYTHON_VERSION=3.11.13
FROM python:${PYTHON_VERSION}-slim as base

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

RUN --mount=type=cache,target=/root/.cache/pip \
    --mount=type=bind,source=./updater/requirements.txt,target=requirements.txt \
    python -m pip install -r requirements.txt

COPY ./updater  /app
COPY ./db /app/db

CMD python updater.py