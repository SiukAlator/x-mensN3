FROM node:8.11.4
ENV PORT 5000
ENV DB_HOST 10.128.0.9
ENV DB_USER root
ENV DB_PASS password
ENV DB_NAME test
USER root
LABEL author="César Delgado" maintainer="cesar.delgado.arcos@gmail.com"

COPY ./ .
RUN npm install

CMD ["node", "server.js"]