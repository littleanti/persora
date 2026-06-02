import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import type { InlineImage, PersonaFields, PersonaRecord, PersonaSummary } from '@/lib/types';
import { formatDate, getInitial } from '@/lib/dom';
import { fileToInlineImage } from '@/lib/image';
import { t } from '@/lib/i18n';
import { createPersona, getPersona, listPersonaSummaries, removePersona, updatePersona } from '@/lib/persona';
import { useApp } from '@/lib/store';
import { useLocale, useT } from '@/lib/useI18n';

type InputMode = 'text' | 'image';
type DetailTab = 'other' | 'me';

const FIELD_LABELS: Record<string, string> = {
  communication_style: 'field.communication_style',
  speech_level: 'field.speech_level',
  vocabulary_examples: 'field.vocabulary_examples',
  sentence_style: 'field.sentence_style',
  emoji_symbol_usage: 'field.emoji_symbol_usage',
  texting_habits: 'field.texting_habits',
  emotional_tendencies: 'field.emotional_tendencies',
  what_they_value: 'field.what_they_value',
  how_they_seek_response: 'field.how_they_seek_response',
  relationship_dynamics: 'field.relationship_dynamics',
  tone: 'field.tone',
  key_interactions: 'field.key_interactions',
};

function toReadable(value: unknown): string {
  if (value == null) return '';
  if (typeof value !== 'object') return String(value);
  if (Array.isArray(value)) return value.map(toReadable).filter(Boolean).join(', ');
  return Object.values(value as Record<string, unknown>).map(toReadable).filter(Boolean).join(' / ');
}

function isEmpty(value: unknown): boolean {
  if (value == null) return true;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value as Record<string, unknown>).length === 0;
  return !String(value).trim();
}

function normalizePersonaData(data: PersonaRecord): { personaData: PersonaFields; myPersonaData: PersonaFields } {
  let personaData: PersonaFields = data.persona || {};
  let myPersonaData: PersonaFields = data.my_persona || {};

  if (
    personaData.other &&
    typeof personaData.other === 'object' &&
    !personaData.summary &&
    !personaData.communication_style &&
    !personaData.tone
  ) {
    if (!Object.keys(myPersonaData).length && personaData.self) {
      myPersonaData = personaData.self as PersonaFields;
    }
    personaData = personaData.other as PersonaFields;
  } else if (personaData.other_persona && typeof personaData.other_persona === 'object') {
    if (!Object.keys(myPersonaData).length && personaData.my_persona) {
      myPersonaData = personaData.my_persona as PersonaFields;
    }
    personaData = personaData.other_persona as PersonaFields;
  }

  return { personaData, myPersonaData };
}

function PersonaFieldsView({ fields }: { fields: PersonaFields }) {
  const translate = useT();
  const entries = Object.entries(fields).filter(([key, value]) => key !== 'summary' && !isEmpty(value));

  if (entries.length === 0) {
    return <p className="text-sm text-slate-400">{translate('persona.summaryFallback')}</p>;
  }

  return (
    <div className="space-y-2">
      {entries.map(([key, value]) => {
        const isList = Array.isArray(value);
        return (
          <div key={key} className="rounded-2xl bg-slate-50 border border-slate-200 px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-indigo-600 mb-1">
              {translate(FIELD_LABELS[key] ?? key)}
            </p>
            {isList ? (
              <div className="flex flex-wrap gap-1.5">
                {(value as unknown[]).map((item, index) => (
                  <span key={index} className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-600">
                    {toReadable(item)}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm leading-relaxed text-slate-700 whitespace-pre-wrap">{toReadable(value)}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

function CreatePersonaDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const apiKey = useApp((s) => s.apiKey);
  const pushToast = useApp((s) => s.pushToast);
  const translate = useT();

  const [name, setName] = useState('');
  const [myName, setMyName] = useState('');
  const [conversation, setConversation] = useState('');
  const [mode, setMode] = useState<InputMode>('text');
  const [images, setImages] = useState<InlineImage[]>([]);
  const [saving, setSaving] = useState(false);
  // 백드롭 클릭으로만 닫기 — textarea에서 드래그(텍스트 선택) 후 백드롭에서 손을 떼면
  // click 이벤트가 공통 조상(백드롭)에서 발생해 모달이 잘못 닫히는 버그를 막는다.
  const pressedOnBackdrop = useRef(false);

  if (!open) return null;

  const reset = () => {
    setName('');
    setMyName('');
    setConversation('');
    setMode('text');
    setImages([]);
  };

  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    try {
      const next = await Promise.all(Array.from(files).map(fileToInlineImage));
      setImages((current) => [...current, ...next]);
    } catch {
      pushToast(translate('toast.imageLoadFail'), 'error');
    }
  };

  const onCreate = async () => {
    const trimmedName = name.trim();
    const trimmedMyName = myName.trim();
    if (!trimmedName) {
      pushToast(translate('toast.enterName'), 'error');
      return;
    }
    if (!apiKey) {
      pushToast(translate('status.noKey'), 'error');
      return;
    }

    let payloadConversation = conversation.trim();
    let payloadImages: InlineImage[] | undefined;

    if (mode === 'image') {
      if (images.length === 0) {
        pushToast(translate('toast.addImage'), 'error');
        return;
      }
      payloadImages = images;
      payloadConversation = translate('placeholder.imageCreated', { n: images.length });
    } else if (payloadConversation.length < 20) {
      pushToast(translate('toast.convTooShort'), 'error');
      return;
    }

    setSaving(true);
    try {
      await createPersona({
        name: trimmedName,
        my_name: trimmedMyName,
        conversation: payloadConversation,
        images: payloadImages,
      });
      pushToast(translate('toast.personaCreated', { name: trimmedName }), 'success');
      reset();
      onCreated();
      onClose();
    } catch (err) {
      // generate()가 이미 현지화된 사용자 친화 메시지를 던지므로 그대로 노출 (원인 진단 가능하게)
      const msg = err instanceof Error && err.message ? err.message : translate('toast.personaCreateFail');
      pushToast(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  // body로 포털 렌더 — space-y-* 등 부모 레이아웃의 margin 주입을 피해 fixed inset-0 이 뷰포트 전체를 덮게 한다.
  return createPortal(
    <div
      className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 flex items-end justify-center"
      onMouseDown={(e) => {
        pressedOnBackdrop.current = e.target === e.currentTarget;
      }}
      onClick={(e) => {
        // 누름과 뗌이 모두 백드롭에서 일어난 진짜 백드롭 클릭일 때만 닫는다.
        if (e.target === e.currentTarget && pressedOnBackdrop.current) onClose();
        pressedOnBackdrop.current = false;
      }}
    >
      <div className="w-full max-w-lg h-[92dvh] flex flex-col bg-white border border-slate-200 rounded-t-3xl shadow-soft-lg animate-slide-up">
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-slate-300" />
        </div>
        <div className="flex items-center justify-between px-5 py-3 shrink-0">
          <h3 className="font-semibold text-slate-900 text-base">{translate('create.title')}</h3>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-full bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors text-lg leading-none"
          >
            x
          </button>
        </div>

        <div className="px-5 pb-6 flex-1 min-h-0 overflow-y-auto flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <label className="space-y-1">
              <span className="text-xs font-medium text-slate-500">{translate('create.otherName')}</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={translate('create.otherNamePlaceholder')}
                className="w-full bg-slate-50 border-[1.5px] border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white transition-colors"
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs font-medium text-slate-500">{translate('create.myName')}</span>
              <input
                value={myName}
                onChange={(e) => setMyName(e.target.value)}
                placeholder={translate('create.myNamePlaceholder')}
                className="w-full bg-slate-50 border-[1.5px] border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white transition-colors"
              />
            </label>
          </div>

          <div className="flex rounded-2xl bg-slate-100 p-1 text-xs font-semibold">
            {(['text', 'image'] as InputMode[]).map((item) => (
              <button
                key={item}
                onClick={() => setMode(item)}
                className={`flex-1 rounded-xl px-3 py-2 transition-colors ${
                  mode === item ? 'bg-white text-indigo-600 shadow-soft-sm' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                {item === 'text' ? translate('create.tabText') : translate('create.tabImage')}
              </button>
            ))}
          </div>

          {mode === 'text' ? (
            <>
              <textarea
                value={conversation}
                onChange={(e) => setConversation(e.target.value)}
                rows={8}
                placeholder={translate('create.convPlaceholder')}
                className="w-full flex-1 min-h-[10rem] bg-slate-50 border-[1.5px] border-slate-200 rounded-2xl px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white resize-none transition-colors leading-relaxed"
              />
              <p className="text-xs text-slate-400 leading-relaxed shrink-0">{translate('create.textHint')}</p>
            </>
          ) : (
            <>
              <label className="flex flex-1 flex-col items-center justify-center gap-2 min-h-32 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 text-slate-400 text-sm font-medium cursor-pointer hover:border-indigo-300 hover:text-indigo-500 transition-colors">
                <input type="file" accept="image/*" multiple hidden onChange={(e) => void onFiles(e.target.files)} />
                <span>{translate('create.imageDropzone')}</span>
              </label>
              {images.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {images.map((img, index) => (
                    <div key={`${img.data.slice(0, 12)}-${index}`} className="relative w-16 h-16 overflow-hidden rounded-xl border border-slate-200">
                      <img src={`data:${img.mimeType};base64,${img.data}`} alt="" className="w-full h-full object-cover" />
                      <button
                        onClick={() => setImages((current) => current.filter((_, i) => i !== index))}
                        className="absolute top-1 right-1 w-5 h-5 rounded-full bg-slate-900/70 text-white text-xs leading-none"
                      >
                        x
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-xs text-slate-400 leading-relaxed">{translate('create.imageHint')}</p>
            </>
          )}

          <button
            onClick={() => void onCreate()}
            disabled={saving}
            className="w-full py-3 rounded-full bg-wordrobe-gradient text-white font-semibold text-sm shadow-glow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[.98] shrink-0"
          >
            {saving ? translate('loading.creatingPersona') : translate('btn.create')}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function PersonaDetailDialog({
  persona,
  onClose,
  onDeleted,
  onUpdated,
}: {
  persona: PersonaRecord | null;
  onClose: () => void;
  onDeleted: () => void;
  onUpdated: (record: PersonaRecord) => void;
}) {
  const navigate = useNavigate();
  const selectedId = useApp((s) => s.selectedPersonaId);
  const setSelectedPersonaId = useApp((s) => s.setSelectedPersonaId);
  const apiKey = useApp((s) => s.apiKey);
  const pushToast = useApp((s) => s.pushToast);
  const translate = useT();
  const [tab, setTab] = useState<DetailTab>('other');
  const [showConversation, setShowConversation] = useState(false);
  const [updateText, setUpdateText] = useState('');
  const [updating, setUpdating] = useState(false);
  const pressedOnBackdrop = useRef(false);

  useEffect(() => {
    setTab('other');
    setShowConversation(false);
    setUpdateText('');
  }, [persona?.id]);

  if (!persona) return null;

  const { personaData, myPersonaData } = normalizePersonaData(persona);
  const hasDual = !!persona.my_name && Object.keys(myPersonaData).length > 0;
  const activeFields = tab === 'me' ? myPersonaData : personaData;
  const summary = activeFields.summary;

  const onUse = () => {
    setSelectedPersonaId(persona.id);
    pushToast(translate('toast.personaSelected', { name: persona.name }), 'success');
    onClose();
    navigate('/analyze');
  };

  const onDelete = async () => {
    if (!window.confirm(translate('confirm.deletePersona', { name: persona.name }))) return;
    try {
      await removePersona(persona.id);
      if (selectedId === persona.id) setSelectedPersonaId(null);
      pushToast(translate('toast.personaDeleted', { name: persona.name }), 'success');
      onDeleted();
      onClose();
    } catch {
      pushToast(translate('toast.deleteFail'), 'error');
    }
  };

  const onUpdate = async () => {
    if (!apiKey) {
      pushToast(translate('status.noKey'), 'error');
      return;
    }
    if (!updateText.trim()) {
      pushToast(translate('toast.enterConversation'), 'error');
      return;
    }
    setUpdating(true);
    try {
      const record = await updatePersona(persona.id, { conversation: updateText.trim() });
      pushToast(translate('toast.personaUpdated', { name: persona.name }), 'success');
      setUpdateText('');
      onUpdated(record);
    } catch (err) {
      const msg = err instanceof Error && err.message ? err.message : translate('toast.personaUpdateFail');
      pushToast(msg, 'error');
    } finally {
      setUpdating(false);
    }
  };

  // body로 포털 렌더 — 부모의 space-y-* margin 주입을 피해 fixed inset-0 이 뷰포트 전체를 덮게 한다.
  return createPortal(
    <div
      className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 flex items-end justify-center"
      onMouseDown={(e) => {
        pressedOnBackdrop.current = e.target === e.currentTarget;
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && pressedOnBackdrop.current) onClose();
        pressedOnBackdrop.current = false;
      }}
    >
      <div className="w-full max-w-lg max-h-[92dvh] overflow-y-auto bg-white border border-slate-200 rounded-t-3xl shadow-soft-lg animate-slide-up">
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-slate-300" />
        </div>
        <div className="flex items-center justify-between px-5 py-3">
          <h3 className="font-semibold text-slate-900 text-base">{translate('detail.title')}</h3>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-full bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors text-lg leading-none"
          >
            x
          </button>
        </div>

        <div className="px-5 pb-6 space-y-4">
          <div className="text-center pt-2">
            <div className="w-20 h-20 rounded-full bg-avatar-gradient flex items-center justify-center shadow-glow mx-auto mb-3">
              <span className="text-white font-bold text-2xl">{getInitial(persona.name)}</span>
            </div>
            <h2 className="text-xl font-bold text-slate-900">{persona.name}</h2>
            <p className="text-xs text-slate-400 mt-1">{translate('detail.createdAt', { date: formatDate(persona.created_at) })}</p>
            {persona.my_name && (
              <span className="inline-flex mt-2 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-xs font-semibold text-emerald-600">
                {translate('detail.myLabel', { my: persona.my_name })}
              </span>
            )}
          </div>

          {hasDual && (
            <div className="flex rounded-2xl bg-slate-100 p-1 text-xs font-semibold">
              <button
                onClick={() => setTab('other')}
                className={`flex-1 rounded-xl px-3 py-2 transition-colors ${
                  tab === 'other' ? 'bg-white text-indigo-600 shadow-soft-sm' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                {persona.name}
              </button>
              <button
                onClick={() => setTab('me')}
                className={`flex-1 rounded-xl px-3 py-2 transition-colors ${
                  tab === 'me' ? 'bg-white text-indigo-600 shadow-soft-sm' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                {translate('detail.tabMe', { my: persona.my_name })}
              </button>
            </div>
          )}

          {summary && (
            <div className="rounded-2xl bg-indigo-50 border border-indigo-100 px-4 py-3">
              <p className="text-sm leading-relaxed text-slate-700">{String(summary)}</p>
            </div>
          )}

          <PersonaFieldsView fields={activeFields} />

          <div className="rounded-2xl bg-slate-50 border border-slate-200 overflow-hidden">
            <button
              onClick={() => setShowConversation((value) => !value)}
              className="w-full px-4 py-3 flex items-center justify-between text-sm font-medium text-slate-500"
            >
              <span>{translate('detail.convToggle')}</span>
              <svg viewBox="0 0 24 24" className={`w-4 h-4 transition-transform ${showConversation ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
            {showConversation && (
              <pre className="px-4 pb-4 text-xs leading-relaxed whitespace-pre-wrap text-slate-500 max-h-48 overflow-y-auto">
                {persona.conversation}
              </pre>
            )}
          </div>

          <div className="rounded-2xl bg-slate-50 border border-slate-200 px-4 py-3 space-y-2">
            <p className="text-sm font-medium text-slate-600">{translate('detail.updateTitle')}</p>
            <textarea
              value={updateText}
              onChange={(e) => setUpdateText(e.target.value)}
              rows={3}
              placeholder={translate('detail.updatePlaceholder')}
              className="w-full bg-white border-[1.5px] border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 resize-none transition-colors"
            />
            <button
              onClick={() => void onUpdate()}
              disabled={updating || !updateText.trim()}
              className="w-full py-2.5 rounded-full bg-indigo-50 text-indigo-600 font-semibold text-sm transition-all active:scale-[.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {updating ? translate('loading.updating') : translate('btn.update')}
            </button>
          </div>

          <div className="grid grid-cols-[1fr_auto] gap-3">
            <button
              onClick={onUse}
              className="py-3 rounded-full bg-indigo-50 text-indigo-600 font-semibold text-sm transition-all active:scale-[.98]"
            >
              {translate('detail.useForAnalysis')}
            </button>
            <button
              onClick={() => void onDelete()}
              className="px-5 py-3 rounded-full bg-red-50 text-red-500 font-semibold text-sm transition-all active:scale-[.98]"
            >
              {translate('detail.delete')}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export default function PersonaPage() {
  const translate = useT();
  useLocale();
  const pushToast = useApp((s) => s.pushToast);
  const [personas, setPersonas] = useState<PersonaSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [detail, setDetail] = useState<PersonaRecord | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      setPersonas(await listPersonaSummaries());
    } catch {
      pushToast(translate('toast.loadPersonaFail'), 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const openDetail = async (id: string) => {
    setDetailLoading(true);
    try {
      const record = await getPersona(id);
      if (!record) throw new Error('not found');
      setDetail(record);
    } catch {
      pushToast(translate('toast.loadDetailFail'), 'error');
    } finally {
      setDetailLoading(false);
    }
  };

  const personaCount = useMemo(() => personas.length, [personas]);

  return (
    <section className="max-w-2xl mx-auto px-4 py-6 space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-slate-900">{translate('nav.personas')}</h1>
          <p className="text-sm text-slate-500 mt-1">{translate('personas.empty.desc').replace(/<br>/g, ' ')}</p>
        </div>
        <button
          onClick={() => setCreateOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold text-white bg-wordrobe-gradient shadow-glow-sm transition-all active:scale-[.98] flex-shrink-0"
        >
          <span>+</span>
          <span>{translate('btn.createPersona')}</span>
        </button>
      </div>

      {loading && <p className="text-slate-400 text-sm text-center py-8">{translate('common.loading')}</p>}

      {!loading && personaCount === 0 && (
        <div className="border-2 border-dashed border-slate-300 rounded-2xl p-10 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-indigo-50 text-indigo-500 flex items-center justify-center mx-auto text-2xl font-bold">
            P
          </div>
          <div>
            <p className="text-slate-700 text-sm font-semibold">{translate('personas.empty.title')}</p>
            <p className="text-slate-400 text-xs mt-1">{translate('personas.empty.desc').replace(/<br>/g, ' ')}</p>
          </div>
          <button
            onClick={() => setCreateOpen(true)}
            className="px-5 py-2.5 rounded-full bg-wordrobe-gradient text-white font-semibold text-sm shadow-glow-sm transition-all active:scale-[.98]"
          >
            {translate('btn.createPersona')}
          </button>
        </div>
      )}

      {!loading && personaCount > 0 && (
        <div className="space-y-3">
          {personas.map((persona) => (
            <button
              key={persona.id}
              onClick={() => void openDetail(persona.id)}
              className="w-full rounded-2xl bg-white border border-slate-200 px-4 py-4 shadow-soft-sm text-left flex items-center gap-3 transition-all active:scale-[.99]"
            >
              <div className="w-12 h-12 rounded-full bg-avatar-gradient flex items-center justify-center text-white font-bold flex-shrink-0">
                {getInitial(persona.name)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 min-w-0">
                  <p className="font-semibold text-slate-900 truncate">{persona.name}</p>
                  {persona.my_name && (
                    <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-600 flex-shrink-0">
                      {translate('detail.myLabel', { my: persona.my_name })}
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-500 truncate mt-0.5">{persona.summary || translate('persona.summaryFallback')}</p>
                <p className="text-xs text-slate-400 mt-0.5">{formatDate(persona.created_at)}</p>
              </div>
              <svg viewBox="0 0 24 24" className="w-4 h-4 text-slate-300 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          ))}
        </div>
      )}

      {detailLoading &&
        createPortal(
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/20 backdrop-blur-sm">
            <div className="rounded-2xl bg-white px-5 py-4 shadow-soft-lg text-sm text-slate-500">{translate('common.loading')}</div>
          </div>,
          document.body,
        )}

      <CreatePersonaDialog open={createOpen} onClose={() => setCreateOpen(false)} onCreated={() => void load()} />
      <PersonaDetailDialog
        persona={detail}
        onClose={() => setDetail(null)}
        onDeleted={() => void load()}
        onUpdated={(rec) => {
          setDetail(rec);
          void load();
        }}
      />
    </section>
  );
}
