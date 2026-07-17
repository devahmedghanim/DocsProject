//#region Edit By AI
export enum ApiMode {
    Local = 'local',
    Server = 'server',
}

// غيّر القيمة هنا فقط للتبديل بين بيئة العمل المحلية والسيرفر.
const ACTIVE_API_MODE: ApiMode = ApiMode.Server;

interface ApiRuntimeConfig {
    readonly mode: ApiMode;
    readonly origin: string;
    readonly apiPrefix: string;
    readonly useApi: boolean;
    readonly authBaseUrl: string;
    readonly docsBaseUrl: string;
    readonly groupsUrl: string;
    readonly sectionsUrl: string;
    readonly guidesBaseUrl: string;
    readonly uploadsBaseUrl: string;
}

const ORIGINS: Record<ApiMode, string> = {
    [ApiMode.Local]: '',
    [ApiMode.Server]: 'https://docs.ecss-sa.com',
};

const API_PREFIXES: Record<ApiMode, string> = {
    [ApiMode.Local]: '/api',
    [ApiMode.Server]: '/Api/api',
};

const LOCALHOST_ORIGIN = 'http://localhost:4200';

const isLocalhostHost = (): boolean => {
    if (typeof window === 'undefined') {
        return false;
    }

    return window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
};

const resolveOrigin = (mode: ApiMode): string => {
    if (mode === ApiMode.Server && isLocalhostHost()) {
        return LOCALHOST_ORIGIN;
    }

    return ORIGINS[mode];
};

const resolveApiPrefix = (mode: ApiMode, origin: string): string => {
    if (mode === ApiMode.Server && origin === LOCALHOST_ORIGIN) {
        return '/api';
    }

    return API_PREFIXES[mode];
};

const withOrigin = (origin: string, path: string): string => `${origin}${path}`;

const ACTIVE_ORIGIN = resolveOrigin(ACTIVE_API_MODE);
const ACTIVE_API_PREFIX = resolveApiPrefix(ACTIVE_API_MODE, ACTIVE_ORIGIN);

export const API_RUNTIME_CONFIG: ApiRuntimeConfig = {
    mode: ACTIVE_API_MODE,
    origin: ACTIVE_ORIGIN,
    apiPrefix: ACTIVE_API_PREFIX,
    useApi: true,
    authBaseUrl: withOrigin(ACTIVE_ORIGIN, `${ACTIVE_API_PREFIX}/auth`),
    docsBaseUrl: withOrigin(ACTIVE_ORIGIN, `${ACTIVE_API_PREFIX}/docs`),
    groupsUrl: withOrigin(ACTIVE_ORIGIN, '/data/groups.json'),
    sectionsUrl: withOrigin(ACTIVE_ORIGIN, '/data/sections.json'),
    guidesBaseUrl: withOrigin(ACTIVE_ORIGIN, '/data/guides'),
    uploadsBaseUrl: withOrigin(ACTIVE_ORIGIN, '/uploads'),
};
//#endregion Edit By AI
