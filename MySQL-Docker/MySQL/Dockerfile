FROM mysql:5

ENV MYSQL_ROOT_PASSWORD 123
ENV MYSQL_DATABASE yelpapi
ENV MYSQL_USER jeremy
ENV MYSQL_PASSWORD root

COPY setup.sql /docker-entrypoint-initdb.d
