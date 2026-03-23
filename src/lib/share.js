import { GEMINI_CONFIG } from "../config/appConfig";
import { readJSONStorage, writeJSONStorage } from "./storage";

function safeBase64Encode(text) {
  return window.btoa(unescape(encodeURIComponent(text)));
}

function safeBase64Decode(text) {
  return decodeURIComponent(escape(window.atob(text)));
}

export function buildSharePayload(result) {
  return safeBase64Encode(JSON.stringify(result));
}

export function parseSharePayload(payload) {
  return JSON.parse(safeBase64Decode(payload));
}

export function saveShareResult(result) {
  const shareId = `share_${Date.now()}`;
  const index = readJSONStorage(GEMINI_CONFIG.storageKeys.shareIndex, {});
  index[shareId] = result;
  writeJSONStorage(GEMINI_CONFIG.storageKeys.shareIndex, index);
  return shareId;
}

export function loadSharedResult(shareId) {
  const index = readJSONStorage(GEMINI_CONFIG.storageKeys.shareIndex, {});
  return index[shareId] || null;
}

export function buildShareUrl(shareId, result) {
  if (typeof window === "undefined") return "";
  const url = new URL(window.location.href);
  url.searchParams.set("share", shareId);
  url.hash = buildSharePayload(result);
  return url.toString();
}
