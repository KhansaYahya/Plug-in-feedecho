/* global Office PowerPoint document sessionStorage console window navigator XMLHttpRequest self setTimeout clearTimeout */

import "../polyfills/fetch";
import { BACKEND_URL, FIREBASE_WEB_API_KEY } from "./config";

function clearElement(el) {
  if (!el) {
    return;
  }
  while (el.firstChild) {
    el.removeChild(el.firstChild);
  }
}

function nativeFetch() {
  if (typeof window !== "undefined" && typeof window.fetch === "function") {
    return window.fetch.bind(window);
  }
  if (typeof self !== "undefined" && typeof self.fetch === "function") {
    return self.fetch.bind(self);
  }
  return null;
}

function httpFetch(url, options) {
  const impl = nativeFetch();
  if (impl) {
    return impl(url, options);
  }

  const opts = options || {};
  return new Promise(function (resolve, reject) {
    const xhr = new XMLHttpRequest();
    xhr.open((opts.method || "GET").toUpperCase(), url, true);

    const headers = opts.headers || {};
    Object.keys(headers).forEach(function (key) {
      xhr.setRequestHeader(key, headers[key]);
    });

    xhr.onload = function () {
      const body = xhr.responseText;
      resolve({
        ok: xhr.status >= 200 && xhr.status < 300,
        status: xhr.status,
        json: function () {
          try {
            return Promise.resolve(JSON.parse(body || "null"));
          } catch (error) {
            return Promise.reject(error);
          }
        },
        text: function () {
          return Promise.resolve(body);
        },
      });
    };

    xhr.onerror = function () {
      reject(new TypeError("Failed to fetch"));
    };

    xhr.send(opts.body || null);
  });
}

const AUTH_STORAGE_KEY = "feedecho-addin-auth";
const INVALID_CREDENTIALS_MESSAGE = "Invalid email or password";

let authState = {
  token: null,
  teacherId: null,
  teacherName: null,
};

let sessionState = {
  id: null,
  sessionCode: null,
  sessionName: null,
};

function initialsFromName(name) {
  const parts = String(name || "Teacher")
    .trim()
    .split(/\s+/);
  if (!parts[0]) {
    return "T";
  }
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

function teacherNameFromUser(user) {
  if (!user) {
    return "";
  }

  const fromParts = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  return user.displayName || fromParts || user.email || "Teacher";
}

function canAccessTeacherPortal(user) {
  const roles = Array.isArray(user?.roles) ? user.roles : [];
  return roles.includes("teacher") || roles.includes("admin") || user?.role === "teacher" || user?.role === "admin";
}

const FEEDECHO_Q_TITLE_SHAPE = "FeedEchoQuestionTitle";
const FEEDECHO_Q_OPTIONS_SHAPE = "FeedEchoQuestionOptions";

let pptSlideQueue = Promise.resolve();

function formatSlideError(error) {
  if (!error) {
    return "Unknown error";
  }
  let message = error.message || String(error);
  if (error.code) {
    message += " [code: " + error.code + "]";
  }
  if (error.debugInfo) {
    try {
      message += " " + JSON.stringify(error.debugInfo);
    } catch (stringifyError) {
      message += " " + String(error.debugInfo);
    }
  }
  return message;
}

function showSlideSyncStatus(text) {
  const statusEl = document.getElementById("quiz-builder-slide-status");
  const errorEl = document.getElementById("quiz-builder-error");
  if (errorEl && text) {
    errorEl.hidden = true;
    errorEl.textContent = "";
  }
  if (!statusEl) {
    return;
  }
  statusEl.textContent = text || "";
  statusEl.hidden = !text;
}

function showSlideSyncError(error) {
  const message = "Error creating slide: " + formatSlideError(error);
  console.error("[FeedEcho] " + message, error);
  const statusEl = document.getElementById("quiz-builder-slide-status");
  if (statusEl) {
    statusEl.hidden = true;
    statusEl.textContent = "";
  }
  const errorEl = document.getElementById("quiz-builder-error");
  if (errorEl) {
    errorEl.textContent = message;
    errorEl.hidden = false;
  }
}

let officeReadyInfo = null;

function getOfficeGlobal() {
  if (typeof window !== "undefined") {
    return window;
  }
  if (typeof self !== "undefined") {
    return self;
  }
  return {};
}

function readHostObject(name) {
  const root = getOfficeGlobal();
  try {
    if (root && root[name]) {
      return root[name];
    }
  } catch (error) {
    // Ignore host objects that throw on access.
  }
  try {
    return Function(
      "return (typeof window !== 'undefined' && window['" +
        name +
        "']) || (typeof self !== 'undefined' && self['" +
        name +
        "']) || undefined"
    )();
  } catch (error) {
    return undefined;
  }
}

function getPowerPointApi() {
  const api = readHostObject("PowerPoint");
  if (api && typeof api.run === "function") {
    return api;
  }
  return api || null;
}

function getOfficeDiagnosticsVersion() {
  try {
    const office = readHostObject("Office");
    const diagnostics = office && office.context && office.context.diagnostics;
    if (!diagnostics) {
      return "";
    }
    return diagnostics.version || diagnostics.hostVersion || "";
  } catch (error) {
    return "";
  }
}

function isPowerPointApiSupported() {
  try {
    const office = readHostObject("Office");
    const requirements = office && office.context && office.context.requirements;
    if (!requirements || typeof requirements.isSetSupported !== "function") {
      return false;
    }
    return (
      requirements.isSetSupported("PowerPointApi", "1.3") ||
      requirements.isSetSupported("PowerPointApi", "1.2") ||
      requirements.isSetSupported("PowerPointApi", "1.1") ||
      requirements.isSetSupported("PowerPointApi")
    );
  } catch (error) {
    return false;
  }
}

function getSlideApiUnsupportedMessage() {
  const version = getOfficeDiagnosticsVersion();
  const versionText = version ? " Office version: " + version + "." : "";
  return (
    "This PowerPoint cannot add slides from the add-in." +
    versionText +
    " Automatic slides need the PowerPoint JavaScript API (PowerPointApi 1.3), which this build does not provide (often older perpetual Office or the Internet Explorer webview)." +
    " Update Microsoft 365 PowerPoint (File → Account → Update Now), install Edge WebView2, fully quit PowerPoint, then reopen FeedEcho."
  );
}

function describePowerPointAvailability() {
  const office = readHostObject("Office");
  const context = office && office.context;
  const parts = [];
  const host = (officeReadyInfo && officeReadyInfo.host) || (context && context.host);
  const platform = (officeReadyInfo && officeReadyInfo.platform) || (context && context.platform);
  parts.push("host=" + (host || "unknown"));
  parts.push("platform=" + (platform || "unknown"));
  const version = getOfficeDiagnosticsVersion();
  if (version) {
    parts.push("officeVersion=" + version);
  }
  parts.push("PowerPointApi=" + isPowerPointApiSupported());
  const api = readHostObject("PowerPoint");
  parts.push("typeof window.PowerPoint=" + typeof api);
  if (api) {
    parts.push("typeof PowerPoint.run=" + typeof api.run);
  }
  return parts.join(", ");
}

function enqueuePowerPointTask(task) {
  pptSlideQueue = pptSlideQueue
    .then(function () {
      return task();
    })
    .catch(function (error) {
      console.warn("[FeedEcho] PowerPoint slide sync failed", error);
      showSlideSyncError(error);
    });
  return pptSlideQueue;
}

function waitForPowerPointApi() {
  const office = readHostObject("Office");
  const ready = office && typeof office.onReady === "function" ? office.onReady() : Promise.resolve(officeReadyInfo);
  return Promise.resolve(ready).then(function (info) {
    if (info) {
      officeReadyInfo = info;
    }
    const existing = getPowerPointApi();
    if (existing && typeof existing.run === "function") {
      return existing;
    }
    if (!isPowerPointApiSupported()) {
      console.warn("[FeedEcho] PowerPointApi is not supported", describePowerPointAvailability());
      return Promise.reject(new Error(getSlideApiUnsupportedMessage()));
    }
    return new Promise(function (resolve, reject) {
      const started = Date.now();
      function check() {
        const api = getPowerPointApi();
        if (api && typeof api.run === "function") {
          resolve(api);
          return;
        }
        if (Date.now() - started > 4000) {
          reject(new Error(getSlideApiUnsupportedMessage() + " (" + describePowerPointAvailability() + ")"));
          return;
        }
        setTimeout(check, 100);
      }
      check();
    });
  });
}

function runPowerPoint(callback) {
  return waitForPowerPointApi().then(function (api) {
    return api.run(callback);
  });
}

function questionSlideTitle(question) {
  const text = String(question && question.questionText ? question.questionText : "").trim();
  return text || "Question";
}

function questionSlideOptions(question) {
  const lines = [];
  const options = question && question.options ? question.options : [];
  for (let i = 0; i < options.length; i += 1) {
    const letter = String.fromCharCode(65 + i);
    const text = String(options[i] && options[i].text ? options[i].text : "").trim();
    lines.push(letter + ". " + text);
  }
  return lines.join("\n");
}

function addQuestionTextToSlide(slide, question) {
  const titleBox = slide.shapes.addTextBox(questionSlideTitle(question));
  titleBox.left = 40;
  titleBox.top = 28;
  titleBox.height = 90;
  titleBox.width = 640;
  titleBox.name = FEEDECHO_Q_TITLE_SHAPE;
  titleBox.textFrame.textRange.font.bold = true;
  titleBox.textFrame.textRange.font.size = 28;

  const optionsBox = slide.shapes.addTextBox(questionSlideOptions(question));
  optionsBox.left = 40;
  optionsBox.top = 130;
  optionsBox.height = 340;
  optionsBox.width = 640;
  optionsBox.name = FEEDECHO_Q_OPTIONS_SHAPE;
  optionsBox.textFrame.textRange.font.size = 20;
}

function getSlideById(context, slideId) {
  const slides = context.presentation.slides;
  if (typeof slides.getItemOrNullObject === "function") {
    return slides.getItemOrNullObject(slideId);
  }
  return slides.getItem(slideId);
}

async function getLastSlide(context) {
  const slides = context.presentation.slides;
  if (typeof slides.getCount === "function") {
    const count = slides.getCount();
    await context.sync();
    const index = Math.max((count.value || 1) - 1, 0);
    const slide = slides.getItemAt(index);
    slide.load("id");
    await context.sync();
    return slide;
  }
  slides.load("items/id");
  await context.sync();
  return slides.items[slides.items.length - 1];
}

async function addBlankSlide(context) {
  const slides = context.presentation.slides;
  if (typeof slides.add !== "function") {
    throw new Error("PowerPoint slides.add() is not available in this host.");
  }

  let added;
  try {
    console.log("[FeedEcho] About to call context.presentation.slides.add()");
    added = slides.add();
  } catch (error) {
    console.log("[FeedEcho] About to call context.presentation.slides.add() with layoutId");
    const masters = context.presentation.slideMasters;
    masters.load("items");
    await context.sync();
    const layouts = masters.items[0].layouts;
    layouts.load("items/id");
    await context.sync();
    added = slides.add({ layoutId: layouts.items[0].id });
  }

  if (added && typeof added.load === "function" && added.shapes) {
    added.load("id");
    await context.sync();
    console.log("[FeedEcho] context.sync() completed after slides.add()");
    return added;
  }

  await context.sync();
  console.log("[FeedEcho] context.sync() completed after slides.add() (using last slide)");
  return getLastSlide(context);
}

async function refreshQuestionShapes(context, slide, question) {
  const shapes = slide.shapes;
  shapes.load("items/name");
  await context.sync();
  for (let i = shapes.items.length - 1; i >= 0; i -= 1) {
    const name = shapes.items[i].name;
    if (name === FEEDECHO_Q_TITLE_SHAPE || name === FEEDECHO_Q_OPTIONS_SHAPE) {
      shapes.items[i].delete();
    }
  }
  addQuestionTextToSlide(slide, question);
  await context.sync();
}

function syncQuestionSlide(question, questionNumber) {
  const questionText = questionSlideTitle(question);
  const labelNumber = questionNumber || "?";
  console.log("Attempting to create slide for question: " + questionText);
  if (!question) {
    return pptSlideQueue;
  }
  return enqueuePowerPointTask(async function () {
    if (question.slideId) {
      try {
        let updated = false;
        await runPowerPoint(async function (context) {
          try {
            const existing = getSlideById(context, question.slideId);
            existing.load("id");
            await context.sync();
            console.log("[FeedEcho] context.sync() completed after loading existing slide");
            if (existing.isNullObject) {
              return;
            }
            await refreshQuestionShapes(context, existing, question);
            updated = true;
          } catch (error) {
            console.error("[FeedEcho] Error inside PowerPoint.run() while updating slide", error);
            throw error;
          }
        });
        if (updated) {
          showSlideSyncStatus("Slide added for Question " + labelNumber);
          return;
        }
      } catch (error) {
        console.warn("[FeedEcho] Could not update quiz slide; adding a new one", error);
        question.slideId = null;
      }
    }

    await runPowerPoint(async function (context) {
      try {
        const slide = await addBlankSlide(context);
        addQuestionTextToSlide(slide, question);
        slide.load("id");
        await context.sync();
        console.log("[FeedEcho] context.sync() completed after adding slide content");
        question.slideId = slide.id;
        showSlideSyncStatus("Slide added for Question " + labelNumber);
      } catch (error) {
        console.error("[FeedEcho] Error inside PowerPoint.run() while creating slide", error);
        throw error;
      }
    });
  });
}

function deleteQuestionSlide(slideId) {
  if (!slideId) {
    return pptSlideQueue;
  }
  return enqueuePowerPointTask(function () {
    return runPowerPoint(async function (context) {
      const slide = getSlideById(context, slideId);
      slide.load("id");
      await context.sync();
      if (slide.isNullObject) {
        return;
      }
      slide.delete();
      await context.sync();
    });
  });
}

function scheduleQuestionSlideUpdate(question, questionNumber) {
  if (!question) {
    return;
  }
  console.log("Attempting to create slide for question: " + questionSlideTitle(question));
  if (question._slideTimer) {
    clearTimeout(question._slideTimer);
  }
  question._slideTimer = setTimeout(function () {
    question._slideTimer = null;
    syncQuestionSlide(question, questionNumber);
  }, 350);
}

function persistAuth(nextState) {
  authState = nextState;
  try {
    if (nextState?.token) {
      sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(nextState));
    } else {
      sessionStorage.removeItem(AUTH_STORAGE_KEY);
    }
  } catch (error) {
    console.warn("Could not persist add-in auth session", error);
  }
}

function loadPersistedAuth() {
  try {
    const raw = sessionStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw);
    if (parsed?.token && parsed?.teacherId) {
      authState = parsed;
      return parsed;
    }
  } catch (error) {
    console.warn("Could not restore add-in auth session", error);
  }
  return null;
}

function clearAuth() {
  persistAuth({ token: null, teacherId: null, teacherName: null });
  sessionState = { id: null, sessionCode: null, sessionName: null };
}

function apiUrl(path) {
  const host = window.location.hostname;
  if (host === "localhost" || host === "127.0.0.1") {
    console.log("[FeedEcho] Using webpack /api proxy for", path);
    return path;
  }
  try {
    const backend = new URL(BACKEND_URL);
    if (window.location.protocol === "https:" && backend.protocol === "http:") {
      return path;
    }
  } catch (error) {
    return path;
  }
  return `${BACKEND_URL}${path}`;
}

function formatLoginDebugError(error, step) {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  if (!error) {
    return `Login failed at ${step || "unknown step"} (no error object). Origin: ${origin}`;
  }
  const name = error.name || "Error";
  const message = error.message || String(error);
  const status = error.status != null ? ` status=${error.status}` : "";
  const details = error.details ? ` details=${error.details}` : "";
  const looksLikeCors = /failed to fetch|networkerror|cors|load failed/i.test(message);
  const corsHint = looksLikeCors
    ? ` Possible CORS/network block: request from ${origin} may not be allowed by the API.`
    : "";
  return `[${step}] ${name}: ${message}${status}${details}.${corsHint}`;
}

function authHeaders() {
  const headers = { "Content-Type": "application/json" };
  if (authState.token) {
    headers.Authorization = `Bearer ${authState.token}`;
  }
  if (authState.teacherId) {
    headers["X-User-ID"] = authState.teacherId;
  }
  return headers;
}

async function readJsonSafe(response) {
  try {
    return await response.json();
  } catch (error) {
    return null;
  }
}

function isInvalidCredentialError(codeOrMessage) {
  const value = String(codeOrMessage || "").toUpperCase();
  return (
    value.includes("INVALID_PASSWORD") ||
    value.includes("EMAIL_NOT_FOUND") ||
    value.includes("INVALID_LOGIN_CREDENTIALS") ||
    value.includes("INVALID_EMAIL") ||
    value.includes("INVALID CREDENTIAL") ||
    value.includes("USER-NOT-FOUND") ||
    value.includes("WRONG-PASSWORD")
  );
}

async function signInWithEmailPassword(email, password) {
  const url = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(
    FIREBASE_WEB_API_KEY
  )}`;

  console.log("[FeedEcho] Attempting Firebase auth...", {
    apiKeyPresent: Boolean(FIREBASE_WEB_API_KEY),
    apiKeyPrefix: String(FIREBASE_WEB_API_KEY || "").slice(0, 8),
    email,
  });

  const response = await httpFetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, returnSecureToken: true }),
  });

  const data = await readJsonSafe(response);
  console.log("[FeedEcho] Firebase auth HTTP status", response.status, data);
  if (!response.ok || !data?.idToken) {
    const firebaseMessage = data?.error?.message || data?.error || "";
    const error = new Error(
      firebaseMessage
        ? `Firebase auth failed: ${firebaseMessage}`
        : `Firebase auth failed (HTTP ${response.status})`
    );
    error.status = response.status;
    error.details = JSON.stringify(data);
    throw error;
  }

  console.log("[FeedEcho] Firebase auth succeeded, got idToken");
  return data;
}

async function loginWithBackend(idToken) {
  const url = apiUrl("/api/auth/login");
  console.log("[FeedEcho] Calling backend /api/auth/login...", url);

  const response = await httpFetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken }),
  });

  const data = await readJsonSafe(response);
  console.log("[FeedEcho] Backend login HTTP status", response.status, data);
  if (!response.ok) {
    const backendMessage = data?.error || data?.message || "";
    const error = new Error(
      backendMessage
        ? `Backend login failed: ${backendMessage}`
        : `Backend login failed (HTTP ${response.status})`
    );
    error.status = response.status;
    error.details = JSON.stringify(data);
    throw error;
  }

  const user = data?.user || data?.data?.user || null;
  console.log("[FeedEcho] Backend login succeeded", { hasUser: Boolean(user), keys: data ? Object.keys(data) : [] });
  return {
    ...data,
    user,
    token: data?.token || data?.data?.token || idToken,
  };
}

function sessionCodeFromPayload(payload) {
  if (!payload) {
    return "";
  }
  return String(payload.sessionCode || payload.accessCode || payload.joinCode || "")
    .trim()
    .toUpperCase();
}

function isActiveSessionPayload(payload) {
  if (!payload) {
    return false;
  }
  const status = String(payload.status || "active").toLowerCase();
  return status === "active" && Boolean(sessionCodeFromPayload(payload));
}

async function fetchActiveSession(teacherId) {
  const url = `${apiUrl("/api/sessions/active")}?teacherId=${encodeURIComponent(teacherId)}`;
  const response = await httpFetch(url, {
    method: "GET",
    headers: authHeaders(),
  });
  const data = await readJsonSafe(response);
  if (!response.ok || data?.success === false) {
    throw new Error(data?.error || "Could not check for an active session.");
  }
  return data?.data || null;
}

async function createSession(teacherId, sessionName) {
  const response = await httpFetch(apiUrl("/api/sessions/create"), {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ sessionName, teacherId }),
  });
  const data = await readJsonSafe(response);
  if (!response.ok || !data?.success || !data?.data) {
    throw new Error(data?.error || "Failed to create session.");
  }
  return data.data;
}

async function copyToClipboard(text) {
  const value = String(text || "").trim();
  if (!value) {
    return false;
  }

  try {
    const textarea = document.createElement("textarea");
    textarea.value = value;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.top = "0";
    textarea.style.left = "0";
    textarea.style.opacity = "0";
    textarea.style.pointerEvents = "none";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    textarea.setSelectionRange(0, value.length);
    const copied = document.execCommand("copy");
    document.body.removeChild(textarea);
    if (copied) {
      return true;
    }
  } catch (error) {
    // fall through to Clipboard API
  }

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch (error) {
    return false;
  }

  return false;
}

function normalizeQuizType(type) {
  const raw = String(type || "")
    .trim()
    .toLowerCase()
    .replace(/[_/]+/g, "-");
  if (raw === "multiple choice" || raw === "multiple-choice" || raw === "mcq") {
    return "Multiple Choice";
  }
  return type || "";
}

function isReadyMultipleChoiceQuiz(quiz) {
  if (!quiz || quiz.deletedAt) {
    return false;
  }
  const status = String(quiz.status || "").toLowerCase();
  const isReady = !quiz.launched && status === "ready";
  return isReady && normalizeQuizType(quiz.type) === "Multiple Choice";
}

function questionCountForQuiz(quiz) {
  if (quiz?.questionCount != null && quiz.questionCount !== "") {
    return Number(quiz.questionCount) || 0;
  }
  if (Array.isArray(quiz?.questions)) {
    return quiz.questions.length;
  }
  return 0;
}

async function fetchTeacherQuizzes() {
  const response = await httpFetch(apiUrl("/api/quizzes"), {
    method: "GET",
    headers: authHeaders(),
  });
  const data = await readJsonSafe(response);
  if (!response.ok || data?.success === false) {
    throw new Error(data?.error || "Could not load quizzes from your library.");
  }
  return Array.isArray(data?.data) ? data.data : [];
}

async function launchQuiz(quizId, sessionCode) {
  const now = new Date().toISOString();
  const response = await httpFetch(apiUrl(`/api/quizzes/${encodeURIComponent(quizId)}/launch`), {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      accessCode: sessionCode,
      endTime: null,
      quizAvailabilityMinutes: null,
      timePerStudentMinutes: null,
      shuffleQuestions: false,
      shuffleAnswers: false,
      showFinalScore: true,
      oneAttempt: false,
      launchedAt: now,
    }),
  });
  const data = await readJsonSafe(response);
  if (!response.ok || !data?.success) {
    const error = new Error(data?.error || "Failed to launch quiz.");
    error.status = response.status;
    throw error;
  }
  return data.data;
}

async function createQuiz(payload) {
  const response = await httpFetch(apiUrl("/api/quizzes"), {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  const data = await readJsonSafe(response);
  if (!response.ok || !data?.success || !data?.data) {
    throw new Error(data?.error || "Failed to create quiz.");
  }
  return data.data;
}

function isReadyExitTicket(ticket) {
  if (!ticket) {
    return false;
  }
  const status = String(ticket.status || "").toLowerCase();
  return status === "ready" || status === "draft";
}

async function fetchTeacherExitTickets() {
  const response = await httpFetch(apiUrl("/api/exit-tickets"), {
    method: "GET",
    headers: authHeaders(),
  });
  const data = await readJsonSafe(response);
  if (!response.ok || data?.success === false) {
    throw new Error(data?.error || "Could not load exit tickets from your library.");
  }
  return Array.isArray(data?.data) ? data.data : [];
}

async function launchExitTicket(ticketId) {
  const response = await httpFetch(apiUrl(`/api/exit-tickets/${encodeURIComponent(ticketId)}/start`), {
    method: "POST",
    headers: authHeaders(),
  });
  const data = await readJsonSafe(response);
  if (!response.ok || !data?.success) {
    const error = new Error(data?.error || "Failed to launch exit ticket.");
    error.status = response.status;
    throw error;
  }
  return data.data;
}

Office.onReady((info) => {
  officeReadyInfo = info || officeReadyInfo;
  const powerpointApi = getPowerPointApi();
  console.log("Office is ready, PowerPoint available: " + typeof powerpointApi);
  console.log("[FeedEcho] Office.onReady fired", {
    host: info && info.host,
    platform: info && info.platform,
    details: describePowerPointAvailability(),
    origin: window.location.origin,
    firebaseKeyPrefix: String(FIREBASE_WEB_API_KEY || "").slice(0, 8),
    backend: BACKEND_URL,
  });

  if (info && typeof Office !== "undefined" && Office.HostType && info.host !== Office.HostType.PowerPoint) {
    console.warn("[FeedEcho] Add-in host is not PowerPoint:", info.host);
  }

  const loginSection = document.getElementById("login-section");
  const appHeader = document.getElementById("app-header");
  const appMain = document.getElementById("app-main");
  const homeSection = document.getElementById("home-section");
  const homeCards = document.getElementById("home-cards");
  const homeQuizCard = document.getElementById("home-quiz-card");
  const homeExitTicketCard = document.getElementById("home-exit-ticket-card");
  const sessionSection = document.getElementById("session-section");
  const launchActions = document.getElementById("launch-actions");
  const loginForm = document.getElementById("login-form");
  const loginButton = document.getElementById("login-btn");
  const logoutButton = document.getElementById("logout-btn");
  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");
  const loginError = document.getElementById("login-error");
  const forgotPasswordBtn = document.getElementById("forgot-password-btn");
  const googleSignInBtn = document.getElementById("google-signin-btn");
  const teacherNameEl = document.getElementById("teacher-name");
  const teacherInitialsEl = document.getElementById("teacher-initials");
  const sessionStatus = document.getElementById("session-status");
  const sessionCreate = document.getElementById("session-create");
  const createSessionBtn = document.getElementById("create-session-btn");
  const sessionCodeWrap = document.getElementById("session-code-wrap");
  const sessionCodeEl = document.getElementById("session-code");
  const copySessionCodeBtn = document.getElementById("copy-session-code-btn");
  const sessionError = document.getElementById("session-error");
  const launchMcqBtn = document.getElementById("launch-mcq-btn");
  const launchExitTicketBtn = document.getElementById("launch-exit-ticket-btn");
  const launchSuccess = document.getElementById("launch-success");
  const launchError = document.getElementById("launch-error");
  const quizPicker = document.getElementById("quiz-picker");
  const quizPickerTitle = document.getElementById("quiz-picker-title");
  const quizPickerStatus = document.getElementById("quiz-picker-status");
  const quizList = document.getElementById("quiz-list");
  const confirmLaunchQuizBtn = document.getElementById("confirm-launch-quiz-btn");
  const cancelQuizPickerBtn = document.getElementById("cancel-quiz-picker-btn");
  const quizPickerError = document.getElementById("quiz-picker-error");
  const quizBuilder = document.getElementById("quiz-builder");
  const quizBuilderTitle = document.getElementById("quiz-builder-title");
  const quizBuilderQuestions = document.getElementById("quiz-builder-questions");
  const quizBuilderAddQ = document.getElementById("quiz-builder-add-q");
  const quizBuilderError = document.getElementById("quiz-builder-error");
  const quizBuilderLaunch = document.getElementById("quiz-builder-launch");
  const quizBuilderCancel = document.getElementById("quiz-builder-cancel");

  if (
    !loginSection ||
    !homeSection ||
    !homeCards ||
    !homeQuizCard ||
    !homeExitTicketCard ||
    !sessionSection ||
    !launchActions ||
    !loginForm ||
    !loginButton ||
    !logoutButton ||
    !emailInput ||
    !passwordInput ||
    !loginError ||
    !forgotPasswordBtn ||
    !googleSignInBtn ||
    !teacherNameEl ||
    !sessionStatus ||
    !sessionCreate ||
    !createSessionBtn ||
    !sessionCodeWrap ||
    !sessionCodeEl ||
    !copySessionCodeBtn ||
    !sessionError ||
    !launchMcqBtn ||
    !launchExitTicketBtn ||
    !launchSuccess ||
    !launchError ||
    !quizPicker ||
    !quizPickerTitle ||
    !quizPickerStatus ||
    !quizList ||
    !confirmLaunchQuizBtn ||
    !cancelQuizPickerBtn ||
    !quizPickerError
  ) {
    const missing = [
      ["login-section", loginSection],
      ["home-section", homeSection],
      ["home-cards", homeCards],
      ["home-quiz-card", homeQuizCard],
      ["home-exit-ticket-card", homeExitTicketCard],
      ["login-form", loginForm],
      ["login-btn", loginButton],
      ["login-error", loginError],
    ]
      .filter((item) => !item[1])
      .map((item) => item[0]);
    console.error("[FeedEcho] Missing required DOM nodes; some handlers may not bind", missing);
    if (loginError) {
      loginError.hidden = false;
      loginError.textContent = `Add-in init error: missing elements ${missing.join(", ") || "(see console)"}`;
    }
  }

  let selectedActivityId = null;
  let pickerKind = null;
  let activityLaunched = false;
  let homeIntent = null;
  let builderQuestions = [];

  const applyLaunchIntent = () => {
    if (!launchMcqBtn || !launchExitTicketBtn) {
      return;
    }
    launchMcqBtn.hidden = true;
    launchExitTicketBtn.hidden = true;
  };

  const showError = (message) => {
    console.log("[FeedEcho] showError", message);
    if (!loginError) {
      console.error("[FeedEcho] login-error element missing; cannot show:", message);
      return;
    }
    loginError.textContent = message || "";
    loginError.hidden = !message;
  };

  const showSessionError = (message) => {
    sessionError.textContent = message;
    sessionError.hidden = !message;
  };

  const showLaunchMessage = (message, isError = false) => {
    if (launchActions && message) {
      launchActions.hidden = false;
    }
    if (isError) {
      launchError.textContent = message;
      launchError.hidden = !message;
      if (message) {
        launchSuccess.hidden = true;
        launchSuccess.textContent = "";
      }
      return;
    }
    launchSuccess.textContent = message;
    launchSuccess.hidden = !message;
    if (message) {
      launchError.hidden = true;
      launchError.textContent = "";
    }
  };

  const setLaunchButtonsEnabled = (enabled) => {
    launchMcqBtn.disabled = !enabled;
    launchExitTicketBtn.disabled = !enabled;
  };

  const hideQuizPicker = () => {
    selectedActivityId = null;
    pickerKind = null;
    clearElement(quizList);
    quizPicker.hidden = true;
    quizPickerTitle.textContent = "Select an activity";
    quizPickerStatus.textContent = "";
    quizPickerError.hidden = true;
    quizPickerError.textContent = "";
    confirmLaunchQuizBtn.disabled = true;
    confirmLaunchQuizBtn.textContent = "Launch selected";
    if (homeSection && !homeSection.hidden && homeCards && (!quizBuilder || quizBuilder.hidden)) {
      homeCards.hidden = false;
    }
  };

  const showBuilderError = (message) => {
    if (!quizBuilderError) {
      return;
    }
    quizBuilderError.textContent = message || "";
    quizBuilderError.hidden = !message;
  };

  const emptyBuilderQuestion = () => {
    return {
      questionText: "",
      options: [
        { id: "a", text: "", isCorrect: true },
        { id: "b", text: "", isCorrect: false },
        { id: "c", text: "", isCorrect: false },
        { id: "d", text: "", isCorrect: false },
      ],
    };
  };

  const hideQuizBuilder = () => {
    if (quizBuilder) {
      quizBuilder.hidden = true;
    }
    showBuilderError("");
    if (homeSection && !homeSection.hidden && homeCards) {
      homeCards.hidden = false;
    }
  };

  const renderQuizBuilderQuestions = () => {
    if (!quizBuilderQuestions) {
      return;
    }
    clearElement(quizBuilderQuestions);
    for (let qIndex = 0; qIndex < builderQuestions.length; qIndex += 1) {
      const question = builderQuestions[qIndex];
      const block = document.createElement("div");
      block.className = "qb-question";

      const head = document.createElement("div");
      head.className = "qb-question-head";
      const label = document.createElement("span");
      label.className = "qb-question-label";
      label.textContent = "Question " + (qIndex + 1);
      head.appendChild(label);
      if (builderQuestions.length > 1) {
        const removeBtn = document.createElement("button");
        removeBtn.type = "button";
        removeBtn.className = "qb-remove";
        removeBtn.textContent = "Remove";
        const removeIndex = qIndex;
        removeBtn.addEventListener("click", () => {
          const removed = builderQuestions[removeIndex];
          if (removed && removed._slideTimer) {
            clearTimeout(removed._slideTimer);
            removed._slideTimer = null;
          }
          builderQuestions.splice(removeIndex, 1);
          renderQuizBuilderQuestions();
          if (removed) {
            deleteQuestionSlide(removed.slideId);
          }
        });
        head.appendChild(removeBtn);
      }
      block.appendChild(head);

      const qInput = document.createElement("input");
      qInput.type = "text";
      qInput.placeholder = "Question text";
      qInput.value = question.questionText;
      qInput.addEventListener("input", () => {
        builderQuestions[qIndex].questionText = qInput.value;
        scheduleQuestionSlideUpdate(builderQuestions[qIndex], qIndex + 1);
      });
      block.appendChild(qInput);

      for (let oIndex = 0; oIndex < question.options.length; oIndex += 1) {
        const option = question.options[oIndex];
        const row = document.createElement("label");
        row.className = "qb-option";
        const radio = document.createElement("input");
        radio.type = "radio";
        radio.name = "qb-correct-" + qIndex;
        radio.checked = Boolean(option.isCorrect);
        radio.addEventListener("change", () => {
          for (let i = 0; i < builderQuestions[qIndex].options.length; i += 1) {
            builderQuestions[qIndex].options[i].isCorrect = i === oIndex;
          }
        });
        const optInput = document.createElement("input");
        optInput.type = "text";
        optInput.placeholder = "Option " + String.fromCharCode(65 + oIndex);
        optInput.value = option.text;
        optInput.addEventListener("input", () => {
          builderQuestions[qIndex].options[oIndex].text = optInput.value;
          scheduleQuestionSlideUpdate(builderQuestions[qIndex], qIndex + 1);
        });
        row.appendChild(radio);
        row.appendChild(optInput);
        block.appendChild(row);
      }

      quizBuilderQuestions.appendChild(block);
    }
  };

  const openQuizBuilder = () => {
    if (!quizBuilder) {
      return;
    }
    if (quizPicker) {
      quizPicker.hidden = true;
    }
    if (homeCards) {
      homeCards.hidden = true;
    }
    quizBuilder.hidden = false;
    if (quizBuilderTitle) {
      quizBuilderTitle.value = "Live quiz";
    }
    builderQuestions = [emptyBuilderQuestion()];
    showBuilderError("");
    renderQuizBuilderQuestions();
    console.log("Attempting to create slide for question: " + questionSlideTitle(builderQuestions[0]));
    syncQuestionSlide(builderQuestions[0], 1);
  };

  const readBuilderPayload = () => {
    const title = quizBuilderTitle ? quizBuilderTitle.value.trim() : "";
    if (!title) {
      throw new Error("Please add a quiz title.");
    }
    if (!builderQuestions.length) {
      throw new Error("Please add at least one question.");
    }
    const questions = [];
    for (let i = 0; i < builderQuestions.length; i += 1) {
      const q = builderQuestions[i];
      const questionText = String(q.questionText || "").trim();
      const filledOptions = [];
      for (let j = 0; j < q.options.length; j += 1) {
        filledOptions.push({
          id: q.options[j].id || String.fromCharCode(97 + j),
          text: String(q.options[j].text || "").trim(),
          isCorrect: Boolean(q.options[j].isCorrect),
        });
      }
      let hasOptionText = false;
      let correctCount = 0;
      for (let j = 0; j < filledOptions.length; j += 1) {
        if (filledOptions[j].text) {
          hasOptionText = true;
        }
        if (filledOptions[j].isCorrect) {
          correctCount += 1;
        }
      }
      if (!questionText || !hasOptionText || correctCount !== 1) {
        throw new Error("Complete each question, add answer options, and mark exactly one correct answer.");
      }
      questions.push({
        id: Date.now() + i,
        questionText: questionText,
        options: filledOptions,
      });
    }
    return {
      title: title,
      description: "",
      type: "Multiple Choice",
      questions: questions,
      questionCount: questions.length,
      status: "Ready",
      launched: false,
    };
  };

  const showLaunchButtons = (visible) => {
    applyLaunchIntent();
    launchActions.hidden = !visible;
    if (!visible) {
      hideQuizPicker();
      showLaunchMessage("");
      showLaunchMessage("", true);
      setLaunchButtonsEnabled(true);
      activityLaunched = false;
    }
  };

  const showCreateSession = (visible) => {
    sessionCreate.hidden = !visible;
  };

  const displaySessionCode = (payload) => {
    const code = sessionCodeFromPayload(payload);
    sessionState = {
      id: payload.id || payload.sessionId || null,
      sessionCode: code,
      sessionName: payload.sessionName || null,
    };
    sessionCodeEl.textContent = code;
    sessionCodeWrap.hidden = false;
    showCreateSession(false);
    sessionStatus.textContent = "Active session";
    activityLaunched = false;
    applyLaunchIntent();
    showLaunchMessage("");
    showLaunchMessage("", true);
  };

  const resetSessionUi = () => {
    sessionState = { id: null, sessionCode: null, sessionName: null };
    sessionCodeEl.textContent = "";
    sessionCodeWrap.hidden = true;
    showCreateSession(false);
    sessionStatus.textContent = "";
    showSessionError("");
    showLaunchButtons(false);
  };

  const showQuizPickerError = (message) => {
    quizPickerError.textContent = message;
    quizPickerError.hidden = !message;
  };

  const renderActivityList = (items, { titleFallback, showQuestionCount }) => {
    clearElement(quizList);
    selectedActivityId = null;
    confirmLaunchQuizBtn.disabled = true;

    items.forEach((item) => {
      const row = document.createElement("button");
      row.type = "button";
      row.className = "quiz-item";
      row.setAttribute("role", "option");
      row.dataset.activityId = item.id;

      const title = document.createElement("span");
      title.className = "quiz-item-title";
      title.textContent = item.title || titleFallback;

      row.appendChild(title);
      if (showQuestionCount) {
        const count = questionCountForQuiz(item);
        const meta = document.createElement("span");
        meta.className = "quiz-item-meta";
        meta.textContent = `${count} question${count === 1 ? "" : "s"}`;
        row.appendChild(meta);
      }

      row.addEventListener("click", () => {
        selectedActivityId = item.id;
        const selectedRows = quizList.querySelectorAll(".quiz-item");
        for (let i = 0; i < selectedRows.length; i += 1) {
          selectedRows[i].classList.remove("is-selected");
        }
        row.classList.add("is-selected");
        confirmLaunchQuizBtn.disabled = activityLaunched;
        showQuizPickerError("");
      });
      quizList.appendChild(row);
    });
  };

  const openQuizPicker = async () => {
    if (!sessionState.sessionCode) {
      showLaunchMessage("Create a session before launching a quiz.", true);
      return;
    }
    if (activityLaunched) {
      return;
    }

    pickerKind = "quiz";
    showLaunchMessage("");
    showLaunchMessage("", true);
    quizPicker.hidden = false;
    quizPickerTitle.textContent = "Select an MCQ quiz";
    clearElement(quizList);
    selectedActivityId = null;
    confirmLaunchQuizBtn.disabled = true;
    confirmLaunchQuizBtn.textContent = "Launch selected quiz";
    quizPickerStatus.textContent = "Loading quizzes…";
    showQuizPickerError("");
    launchMcqBtn.disabled = true;

    try {
      const quizzes = (await fetchTeacherQuizzes()).filter(isReadyMultipleChoiceQuiz);
      if (quizzes.length === 0) {
        quizPickerStatus.textContent = "No ready multiple-choice quizzes in your library.";
        return;
      }
      quizPickerStatus.textContent = "Choose a quiz, then confirm to launch it in this session.";
      renderActivityList(quizzes, { titleFallback: "Untitled Quiz", showQuestionCount: true });
    } catch (error) {
      quizPickerStatus.textContent = "Could not load quizzes.";
      showQuizPickerError(error?.message || "Could not load quizzes from your library.");
    } finally {
      if (!activityLaunched) {
        launchMcqBtn.disabled = false;
      }
    }
  };

  const openExitTicketPicker = async () => {
    if (!sessionState.sessionCode) {
      showLaunchMessage("Create a session before launching an exit ticket.", true);
      return;
    }
    if (activityLaunched) {
      return;
    }

    pickerKind = "exitTicket";
    showLaunchMessage("");
    showLaunchMessage("", true);
    quizPicker.hidden = false;
    quizPickerTitle.textContent = "Select an exit ticket";
    clearElement(quizList);
    selectedActivityId = null;
    confirmLaunchQuizBtn.disabled = true;
    confirmLaunchQuizBtn.textContent = "Launch selected exit ticket";
    quizPickerStatus.textContent = "Loading exit tickets…";
    showQuizPickerError("");
    launchExitTicketBtn.disabled = true;

    try {
      const tickets = (await fetchTeacherExitTickets()).filter(isReadyExitTicket);
      if (tickets.length === 0) {
        quizPickerStatus.textContent = "No ready exit tickets in your library.";
        return;
      }
      quizPickerStatus.textContent = "Choose an exit ticket, then confirm to launch it in this session.";
      renderActivityList(tickets, { titleFallback: "Untitled Exit Ticket", showQuestionCount: false });
    } catch (error) {
      quizPickerStatus.textContent = "Could not load exit tickets.";
      showQuizPickerError(error?.message || "Could not load exit tickets from your library.");
    } finally {
      if (!activityLaunched) {
        launchExitTicketBtn.disabled = false;
      }
    }
  };

  const loadActiveSession = async () => {
    resetSessionUi();
    sessionSection.hidden = false;
    sessionStatus.textContent = "Checking for an active session…";

    if (!authState.teacherId) {
      sessionStatus.textContent = "No active session";
      showCreateSession(true);
      return;
    }

    try {
      const active = await fetchActiveSession(authState.teacherId);
      if (isActiveSessionPayload(active)) {
        displaySessionCode(active);
        return;
      }
      sessionStatus.textContent = "No active session";
      showCreateSession(true);
    } catch (error) {
      sessionStatus.textContent = "Could not load session.";
      showSessionError(error?.message || "Could not check for an active session.");
      showCreateSession(true);
    }
  };

  const showLoggedIn = (teacherName) => {
    console.log("[FeedEcho] Switching to home view", teacherName);
    if (teacherNameEl) {
      teacherNameEl.textContent = teacherName || "Teacher";
    }
    if (teacherInitialsEl) {
      teacherInitialsEl.textContent = initialsFromName(teacherName);
    }
    if (loginSection) {
      loginSection.hidden = true;
    }
    if (appHeader) {
      appHeader.hidden = true;
    }
    if (appMain) {
      appMain.hidden = false;
    }
    if (!homeSection) {
      showError("Login succeeded but the home screen is missing. Reload the add-in to pick up the latest HTML.");
      return;
    }
    homeSection.hidden = false;
    if (homeCards) {
      homeCards.hidden = false;
    }
    homeIntent = null;
    applyLaunchIntent();
    showLaunchButtons(false);
    showError("");
    loadActiveSession();
  };

  const showLoggedOut = () => {
    if (loginSection) {
      loginSection.hidden = false;
    }
    if (appHeader) {
      appHeader.hidden = true;
    }
    if (appMain) {
      appMain.hidden = true;
    }
    if (homeSection) {
      homeSection.hidden = true;
    }
    if (homeCards) {
      homeCards.hidden = true;
    }
    homeIntent = null;
    if (sessionSection) {
      sessionSection.hidden = true;
    }
    if (teacherNameEl) {
      teacherNameEl.textContent = "";
    }
    if (teacherInitialsEl) {
      teacherInitialsEl.textContent = "";
    }
    if (quizBuilder) {
      quizBuilder.hidden = true;
    }
    resetSessionUi();
  };

  const openHomeActivity = (intent) => {
    homeIntent = intent;
    applyLaunchIntent();
    showLaunchMessage("");
    showLaunchMessage("", true);
    if (!sessionState.sessionCode) {
      showSessionError("Create a session before launching an activity.");
      return;
    }
    if (homeCards) {
      homeCards.hidden = true;
    }
    if (intent === "quiz") {
      openQuizBuilder();
      return;
    }
    openExitTicketPicker();
  };

  const persisted = loadPersistedAuth();
  if (persisted) {
    showLoggedIn(persisted.teacherName);
  }

  if (forgotPasswordBtn) {
    forgotPasswordBtn.addEventListener("click", () => {
      showError("Password reset is not available in the add-in yet. Please use the FeedEcho website.");
    });
  }

  if (googleSignInBtn) {
    googleSignInBtn.addEventListener("click", () => {
      // TODO: Connect Google OAuth for the PowerPoint add-in.
    });
  }

  if (homeQuizCard) {
    homeQuizCard.addEventListener("click", () => {
      openHomeActivity("quiz");
    });
  }

  if (homeExitTicketCard) {
    homeExitTicketCard.addEventListener("click", () => {
      openHomeActivity("exitTicket");
    });
  }

  if (quizBuilderAddQ) {
    quizBuilderAddQ.addEventListener("click", () => {
      const question = emptyBuilderQuestion();
      console.log("Attempting to create slide for question: " + questionSlideTitle(question));
      builderQuestions.push(question);
      renderQuizBuilderQuestions();
      syncQuestionSlide(question, builderQuestions.length);
    });
  }

  if (quizBuilderCancel) {
    quizBuilderCancel.addEventListener("click", () => {
      hideQuizBuilder();
    });
  }

  if (quizBuilderLaunch) {
    quizBuilderLaunch.addEventListener("click", async () => {
      if (!sessionState.sessionCode) {
        showBuilderError("Create a session before launching a quiz.");
        return;
      }
      quizBuilderLaunch.disabled = true;
      quizBuilderLaunch.textContent = "Launching…";
      showBuilderError("");
      try {
        const payload = readBuilderPayload();
        const created = await createQuiz(payload);
        const quizId = created.id || created.quizId;
        if (!quizId) {
          throw new Error("Quiz was created without an id.");
        }
        await launchQuiz(quizId, sessionState.sessionCode);
        activityLaunched = true;
        hideQuizBuilder();
        showLaunchMessage("Quiz launched! Students can join with code " + sessionState.sessionCode);
      } catch (error) {
        showBuilderError(error && error.message ? error.message : "Failed to create and launch quiz.");
      } finally {
        quizBuilderLaunch.disabled = false;
        quizBuilderLaunch.textContent = "Launch";
      }
    });
  }

  if (loginForm) {
    loginForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      console.log("[FeedEcho] Login form submit");

      try {
        const email = emailInput ? emailInput.value.trim() : "";
        const password = passwordInput ? passwordInput.value : "";

        if (!email || !password) {
          showError("DEBUG: Email or password is empty.");
          return;
        }

        if (loginButton) {
          loginButton.disabled = true;
          loginButton.textContent = "Signing in…";
        }
        showError("");

        console.log("[FeedEcho] Step 1: Firebase auth starting");
        const firebaseAuth = await signInWithEmailPassword(email, password);
        console.log("[FeedEcho] Step 2: Firebase auth succeeded, got idToken");

        console.log("[FeedEcho] Step 3: Calling backend /api/auth/login...");
        const loginResponse = await loginWithBackend(firebaseAuth.idToken);
        console.log("[FeedEcho] Step 4: Backend login succeeded", loginResponse);

        const user = loginResponse && loginResponse.user;
        if (!user) {
          throw new Error(
            `DEBUG: Backend returned no user. Response keys: ${
              loginResponse ? Object.keys(loginResponse).join(", ") : "null"
            }`
          );
        }

        if (!canAccessTeacherPortal(user)) {
          throw new Error(
            `DEBUG: Account does not have host access. roles=${JSON.stringify(user.roles)} role=${user.role}`
          );
        }

        const teacherName = teacherNameFromUser(user);
        console.log("[FeedEcho] Step 5: Persisting auth and showing home", { teacherName, uid: user.uid });
        persistAuth({
          token: firebaseAuth.idToken || loginResponse.token,
          teacherId: user.uid,
          teacherName,
        });

        if (passwordInput) {
          passwordInput.value = "";
        }
        showLoggedIn(teacherName);
      } catch (error) {
        console.error("[FeedEcho] Login failed", error);
        try {
          clearAuth();
          showLoggedOut();
        } catch (resetError) {
          console.error("[FeedEcho] Failed while resetting after login error", resetError);
        }
        showError(formatLoginDebugError(error, error && error.step ? error.step : "login handler"));
      } finally {
        if (loginButton) {
          loginButton.disabled = false;
          loginButton.textContent = "Login";
        }
      }
    });
  } else {
    console.error("[FeedEcho] login-form not found; Login button will do nothing");
  }

  if (loginButton) {
    loginButton.addEventListener("click", () => {
      console.log("[FeedEcho] Login button clicked");
    });
  }

  if (createSessionBtn) {
    createSessionBtn.addEventListener("click", async () => {
    if (!authState.teacherId) {
      showSessionError("Please sign in again before creating a session.");
      return;
    }

    createSessionBtn.disabled = true;
    createSessionBtn.textContent = "Creating…";
    showSessionError("");

    try {
      const sessionName = authState.teacherName ? `${authState.teacherName}'s Session` : "FeedEcho Session";
      const created = await createSession(authState.teacherId, sessionName);
      if (!sessionCodeFromPayload(created)) {
        throw new Error("Session was created without a code. Please try again.");
      }
      displaySessionCode(created);
    } catch (error) {
      showSessionError(error?.message || "Failed to create session.");
    } finally {
      createSessionBtn.disabled = false;
      createSessionBtn.textContent = "Create session";
    }
    });
  }

  if (copySessionCodeBtn) {
    copySessionCodeBtn.addEventListener("click", async () => {
    const code = sessionState.sessionCode || sessionCodeEl.textContent;
    const copied = await copyToClipboard(code);
    const originalTitle = "Copy session code";
    copySessionCodeBtn.title = copied ? "Copied!" : "Could not copy";
    window.setTimeout(() => {
      copySessionCodeBtn.title = originalTitle;
    }, 1500);
    });
  }

  if (launchMcqBtn) {
    launchMcqBtn.addEventListener("click", () => {
      openQuizPicker();
    });
  }

  if (launchExitTicketBtn) {
    launchExitTicketBtn.addEventListener("click", () => {
      openExitTicketPicker();
    });
  }

  if (cancelQuizPickerBtn) {
    cancelQuizPickerBtn.addEventListener("click", () => {
      hideQuizPicker();
    });
  }

  if (confirmLaunchQuizBtn) {
    confirmLaunchQuizBtn.addEventListener("click", async () => {
    if (!selectedActivityId || !pickerKind) {
      showQuizPickerError("Select an item to launch.");
      return;
    }
    if (!sessionState.sessionCode) {
      showQuizPickerError("Create a session before launching an activity.");
      return;
    }

    const launchingQuiz = pickerKind === "quiz";
    confirmLaunchQuizBtn.disabled = true;
    confirmLaunchQuizBtn.textContent = "Launching…";
    showQuizPickerError("");

    try {
      if (launchingQuiz) {
        await launchQuiz(selectedActivityId, sessionState.sessionCode);
      } else {
        await launchExitTicket(selectedActivityId);
      }
      activityLaunched = true;
      hideQuizPicker();
      setLaunchButtonsEnabled(false);
      showLaunchMessage(
        launchingQuiz
          ? `Quiz launched! Students can join with code ${sessionState.sessionCode}`
          : `Exit ticket launched! Students can join with code ${sessionState.sessionCode}`
      );
    } catch (error) {
      const message = error?.message || (launchingQuiz ? "Failed to launch quiz." : "Failed to launch exit ticket.");
      showQuizPickerError(message);
      showLaunchMessage(message, true);
      confirmLaunchQuizBtn.disabled = false;
      confirmLaunchQuizBtn.textContent = launchingQuiz
        ? "Launch selected quiz"
        : "Launch selected exit ticket";
    }
    });
  }

  if (logoutButton) {
    logoutButton.addEventListener("click", () => {
      clearAuth();
      showLoggedOut();
    });
  }
});
