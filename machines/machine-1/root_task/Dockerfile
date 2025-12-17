FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive
ARG SSH_USER_USERNAME

RUN apt update
RUN apt install -y --no-install-recommends \
      openssh-server \
      vim-nox \
      libcap2-bin \
      python3
RUN rm -rf /var/lib/apt/lists/*
RUN mkdir /var/run/sshd

RUN --mount=type=secret,id=ssh_user_password \
    useradd -m -s /bin/bash "$SSH_USER_USERNAME" && \
    printf '%s:%s\n' "$SSH_USER_USERNAME" "$(cat /run/secrets/ssh_user_password)" | chpasswd

RUN --mount=type=secret,id=GENERATOR_ENABLE_KEY \
    mkdir -p /home/$SSH_USER_USERNAME && \
    cp /run/secrets/GENERATOR_ENABLE_KEY /home/$SSH_USER_USERNAME/GENERATOR_ENABLE_KEY && \
    chown $SSH_USER_USERNAME:$SSH_USER_USERNAME /home/$SSH_USER_USERNAME/GENERATOR_ENABLE_KEY && \
    chmod 600 /home/$SSH_USER_USERNAME/GENERATOR_ENABLE_KEY

RUN --mount=type=secret,id=GENERATOR_RESTART_KEY \
    mkdir -p /root && \
    cp /run/secrets/GENERATOR_RESTART_KEY /root/GENERATOR_RESTART_KEY && \
    chown root:root /root/GENERATOR_RESTART_KEY && \
    chmod 600 /root/GENERATOR_RESTART_KEY

RUN --mount=type=secret,id=AUTHOR_MD \
    cp /run/secrets/AUTHOR_MD /root/author.md && \
    chown root:root /root/author.md  && \
    chmod 600 /root/author.md

RUN setcap cap_setuid+ep /usr/bin/vim.nox || true

EXPOSE 22

CMD ["/usr/sbin/sshd","-D"]