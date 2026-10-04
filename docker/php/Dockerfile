ARG PHP_BASE=php:8.3-fpm
FROM ${PHP_BASE}

ENV COMPOSER_HOME=/composer \
    COMPOSER_ALLOW_SUPERUSER=1

ADD --chmod=0755 https://github.com/mlocati/docker-php-extension-installer/releases/latest/download/install-php-extensions /usr/local/bin/

# git + unzip: required by Composer; extensions: Yii2 requirements (mbstring, ctype, PCRE are built in);
# sockets + bcmath: required by php-amqplib (emulator's RabbitMQ client, docs/architecture/flow.md §6a)
RUN apt-get update \
    && apt-get install -y --no-install-recommends git unzip \
    && rm -rf /var/lib/apt/lists/* \
    && install-php-extensions intl zip pdo_mysql opcache xdebug sockets bcmath

COPY --from=composer:2 /usr/bin/composer /usr/local/bin/composer

COPY docker/php/php.ini /usr/local/etc/php/conf.d/99-app.ini
COPY docker/php/xdebug.ini /usr/local/etc/php/conf.d/99-xdebug.ini
COPY docker/php/entrypoint.sh /usr/local/bin/app-entrypoint
RUN chmod +x /usr/local/bin/app-entrypoint

WORKDIR /app

ENTRYPOINT ["app-entrypoint"]
CMD ["php-fpm"]
