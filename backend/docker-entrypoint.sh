#!/bin/sh
set -e

if [ -z "$SPRING_DATASOURCE_URL" ] \
  && [ -n "$SPRING_DATASOURCE_HOST" ] \
  && [ -n "$SPRING_DATASOURCE_PORT" ] \
  && [ -n "$SPRING_DATASOURCE_DATABASE" ]; then
  export SPRING_DATASOURCE_URL="jdbc:postgresql://${SPRING_DATASOURCE_HOST}:${SPRING_DATASOURCE_PORT}/${SPRING_DATASOURCE_DATABASE}"
fi

exec java -jar app.jar
