// 화면 간 공유되는 가벼운 UI 상태.
// 선택된 페르소나 id는 personaView(선택기)와 analyzeView 양쪽에서 읽고 쓴다.

let selectedPersonaId: string | null = null;

export function getSelectedPersonaId(): string | null {
  return selectedPersonaId;
}

export function setSelectedPersonaId(id: string | null): void {
  selectedPersonaId = id;
}
