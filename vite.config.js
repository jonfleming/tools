import { join, dirname, resolve } from "path";
import { fileURLToPath } from "url";
import react from "@vitejs/plugin-react";
import dns from 'dns';

const path = fileURLToPath(import.meta.url);
console.log("meta", import.meta.url);
console.log("path", path);
console.log("root", join(dirname(path), "client"));

dns.setDefaultResultOrder('verbatim');

export default {
  root: join(dirname(path), "client"),
  plugins: [react()],
  server: {
    host: "localhost",
    port: 3000
  }
};
