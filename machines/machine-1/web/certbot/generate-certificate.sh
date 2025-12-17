#!/bin/bash

rm -rf /etc/letsencrypt/live/certificate*

certbot certonly --standalone --email $DOMAIN_EMAIL -d $DOMAIN_NAME --cert-name=certificate --key-type rsa --agree-tos