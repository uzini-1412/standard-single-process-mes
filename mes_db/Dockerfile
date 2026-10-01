FROM mysql:8.0.36

ENV MYSQL_DATABASE=mes_db
ENV TZ=Asia/Seoul

RUN echo "[mysqld]\ncharacter-set-server=utf8mb4\ncollation-server=utf8mb4_unicode_ci\ninnodb_buffer_pool_size=512M\ninnodb_log_file_size=256M\ninnodb_flush_log_at_trx_commit=2\ninnodb_doublewrite=0\nmax_allowed_packet=64M\nbulk_insert_buffer_size=256M\n[client]\ndefault-character-set=utf8mb4\n[mysql]\ndefault-character-set=utf8mb4" > /etc/mysql/conf.d/charset.cnf

COPY schema.sql /docker-entrypoint-initdb.d/01-schema.sql

EXPOSE 3306
