FROM debian:bookworm-slim AS base-tools

ARG DEBIAN_FRONTEND=noninteractive

ENV LANG=en_US.UTF-8 \
    LANGUAGE=en_US \
    LC_ALL=en_US.UTF-8

RUN apt-get update && \
    apt-get upgrade -y && \
    apt-get autoremove -y && \
    apt-get install -y --no-install-recommends \
    build-essential \
    ca-certificates \
    cmake \
    curl \
    git \
    less \
    locales \
    man-db \
    manpages \
    manpages-dev \
    nano \
    ssh \
    sudo \
    unzip \
    wget \
    zip \
    zsh

RUN curl -s https://packagecloud.io/install/repositories/github/git-lfs/script.deb.sh | bash && \
    apt-get install -y --no-install-recommends \
    git-lfs && \
    git lfs install

RUN install -m 0755 -d /etc/apt/keyrings && \
    curl -fsSL https://download.docker.com/linux/debian/gpg -o /etc/apt/keyrings/docker.asc && \
    chmod a+r /etc/apt/keyrings/docker.asc && \
    echo \
    "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/debian \
    $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
    tee /etc/apt/sources.list.d/docker.list > /dev/null && \
    apt-get update && \
    apt-get install -y --no-install-recommends \
    docker-ce-cli \
    docker-buildx-plugin \
    docker-compose-plugin

RUN sed -i -e "s/# en_US.UTF-8 UTF-8/en_US.UTF-8 UTF-8/" /etc/locale.gen && \
    dpkg-reconfigure --frontend=noninteractive locales && \
    update-locale

RUN --mount=type=bind,target=/install-zsh/devcontainers.zsh-theme,source=devcontainers.zsh-theme \
    sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)" "" --unattended && \
    cp -f /install-zsh/devcontainers.zsh-theme ~/.oh-my-zsh/custom/themes/ && \
    sed -i -E 's/(ZSH_THEME=").+(")/\1devcontainers\2/' ~/.zshrc && \
    echo 'alias ll="LC_ALL=C.UTF-8 ls -AlFp --group-directories-first"' | tee --append \
    ~/.bash_aliases \
    ~/.zshrc && \
    chsh -s /bin/zsh

####################################################################################################

FROM base-tools AS dev-tools

SHELL ["/bin/zsh", "-ic"]

ARG DEBIAN_FRONTEND=noninteractive

RUN apt-get install -y --no-install-recommends \
        python3 \
        python3-dev \
        python3-full \
        python3-pip \
        python3-venv \
        python-is-python3

RUN curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash && \
    . ~/.zshrc && \
    nvm install 22 && \
    nvm current && \
    node -v && \
    npm -v && \
    corepack enable yarn && \
    yarn -v && \
    corepack enable pnpm && \
    pnpm -v

RUN curl -fsSL https://deno.land/install.sh | sh && \
    echo 'export DENO_INSTALL="$HOME/.deno"' >> ~/.zshrc && \
    echo 'export PATH="$DENO_INSTALL/bin:$PATH"' >> ~/.zshrc && \
    . ~/.zshrc && \
    deno --version

RUN curl -fsSL https://bun.sh/install | bash && \
    . ~/.zshrc && \
    bun --version

RUN npm install -g npm && \
    npm install -g \
        node-gyp

ENTRYPOINT []
CMD []
