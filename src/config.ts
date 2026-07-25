import dotenv from "dotenv";
dotenv.config();

const MONGOURI = process.env.MONGOURI || "";
const MONGO_DB_NAME = process.env.MONGO_DB_NAME || "";
const PORT = process.env.PORT
const SECRET_KEY = process.env.JWT_SECRATE_KEY || "";
const ENVIRONMENT = process.env.ENVIRONMENT || "";
const SOCKET_TOKEN = process.env.SOCKET_TOKEN
const CRYPTO_SECRET_KEY = process.env.CRYPTO_SECRET_KEY
const IOSPUSHTOPIC = process.env.IOSPUSHTOPIC as string
const IOSPUSHTEAMID = process.env.IOSPUSHTEAMID as string
const IOSPUSHKEYID = process.env.IOSPUSHKEYID as string

export const config = {
  mongo: {
    uri: MONGOURI
  },
  server: {
    port: PORT
  },
  db: {
    dbname: MONGO_DB_NAME
  },
  key: {
    secret_key: SECRET_KEY
  },
  enviroment: {
    enviroment_type: ENVIRONMENT
  },
  service: {
    type: "service_account",
    project_id: process.env.FIREBASE_PROJECT_ID || "",
    private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID || "",
    private_key: (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
    client_email: process.env.FIREBASE_CLIENT_EMAIL || "",
    client_id: process.env.FIREBASE_CLIENT_ID || "",
    auth_uri: "https://accounts.google.com/o/oauth2/auth",
    token_uri: "https://oauth2.googleapis.com/token",
    auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
    client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL || "",
    universe_domain: "googleapis.com"
  },
  NODECONNECTION:{
    SOCKET_TOKEN:SOCKET_TOKEN
  },
  CRYPTO_SECRET_KEY:{
    SECRET_KEY:CRYPTO_SECRET_KEY
  },
  IOSPUSH:{
    IOSPUSHKEYID : IOSPUSHKEYID,
    IOSPUSHTEAMID : IOSPUSHTEAMID,
    IOSPUSHTOPIC : IOSPUSHTOPIC
  }
}