FROM ubuntu:22.04

EXPOSE 6000 80

ARG DOMAIN_EMAIL
ARG DOMAIN_NAME
ENV DOMAIN_EMAIL=$DOMAIN_EMAIL
ENV DOMAIN_NAME=$DOMAIN_NAME

WORKDIR /certbot
COPY . /certbot
WORKDIR /certbot

RUN apt-get update
RUN apt-get -y install certbot

CMD ["sh", "generate-certificate.sh"]