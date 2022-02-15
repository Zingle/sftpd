FROM node:16

COPY . /tmp/sftpd.js

RUN npm pack /tmp/sftpd.js \
 && npm install -g zingle-sftpd-* \
 && rm -fr /tmp/sftpd.js zingle-sftpd-*

CMD /usr/local/bin/sftpd /etc/sftpd.conf
