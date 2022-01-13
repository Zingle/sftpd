export default function createReadyListener() {
  return function readyListener() {
    console.info(`sftpd: client authenticated -- ${this.username}`);
  };
}
