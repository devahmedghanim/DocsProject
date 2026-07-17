//#region Edit By AI
export interface LocalizedText {
    ar: string;
    en: string;
}

export interface Group {
    id: string;
    route: string;
    icon: string;
    order: number;
    title: LocalizedText;
    desc: LocalizedText;
}

export interface Section {
    id: string;
    route: string;
    icon: string;
    order: number;
    groupRoute: string;
    title: LocalizedText;
    desc: LocalizedText;
}

export interface GuideMedia {
    type: 'image' | 'video' | 'gif';
    src: string;
}

export interface Guide {
    id: string;
    number: number;
    title: LocalizedText;
    desc: LocalizedText;
    media?: Partial<Record<'ar' | 'en', GuideMedia>>;
}

export interface ApiError {
    ok: false;
    error: string;
}
//#endregion Edit By AI
