import ssh from "ssh2";
import {join, resolve} from "path";

const {utils: {sftp: {STATUS_CODE: {OK}}}} = ssh;

export function realpathListener(username) {
  return function realpathListener(reqid, path) {
    const filename = join("/var/sftp", username, resolve("/", path));
    this.name(reqid, [{filename}]);
  }
}
