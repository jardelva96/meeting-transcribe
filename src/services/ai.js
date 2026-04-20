const PROVIDERS = {
  openai: {
    url: 'https://api.openai.com/v1/chat/completions',
    model: 'gpt-4o-mini',
    label: 'OpenAI (GPT-4o mini)',
  },
  groq: {
    url: 'https://api.groq.com/openai/v1/chat/completions',
    model: 'llama-3.3-70b-versatile',
    label: 'Groq (Llama 3.3 70B)',
  },
}

export const PROVIDER_OPTIONS = Object.entries(PROVIDERS).map(([id, p]) => ({ id, label: p.label }))

export function getAISettings() {
  return {
    provider: localStorage.getItem('ai_provider') || 'openai',
    token: localStorage.getItem('ai_token') || '',
  }
}

export function saveAISettings({ provider, token }) {
  localStorage.setItem('ai_provider', provider)
  localStorage.setItem('ai_token', token)
}

async function chat(messages) {
  const { provider, token } = getAISettings()
  if (!token) throw new Error('Configure sua chave de API em Configurações (ícone de engrenagem).')

  const { url, model } = PROVIDERS[provider]

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model, messages, temperature: 0.4 }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Erro da API (${res.status}): ${err}`)
  }

  const data = await res.json()
  return data.choices[0].message.content
}

const BASE = `Você é um assistente especializado em análise de reuniões corporativas.
Responda sempre em Português do Brasil. Seja preciso, objetivo e profissional.
A transcrição pode ter erros de reconhecimento de fala — use contexto para interpretar.`

export async function generateResumo(transcript) {
  return chat([
    { role: 'system', content: BASE },
    {
      role: 'user',
      content: `Analise esta transcrição e crie um RESUMO EXECUTIVO estruturado com:
- **Objetivo da reunião**
- **Principais pontos discutidos** (bullet points)
- **Decisões tomadas**
- **Conclusão**

Transcrição:
${transcript}`,
    },
  ])
}

export async function generateActionItems(transcript) {
  return chat([
    { role: 'system', content: BASE },
    {
      role: 'user',
      content: `Analise esta transcrição e extraia todos os ACTION ITEMS.

Para cada item:
- **Tarefa**: o que precisa ser feito
- **Responsável**: quem vai fazer (se mencionado, senão "A definir")
- **Prazo**: quando (se mencionado, senão "A definir")
- **Prioridade**: Alta / Média / Baixa (baseado no contexto)

Formate como lista numerada. Se não houver tarefas claras, mencione isso.

Transcrição:
${transcript}`,
    },
  ])
}

export async function generateQA(transcript) {
  return chat([
    { role: 'system', content: BASE },
    {
      role: 'user',
      content: `Analise esta transcrição e extraia os principais TEMAS DEBATIDOS com perguntas e respostas.

Para cada tópico:
- **Questão / Tema levantado**
- **Resposta / Posição adotada**

Se não houver perguntas explícitas, extraia os tópicos mais debatidos com os diferentes pontos de vista.

Transcrição:
${transcript}`,
    },
  ])
}

export async function generateEmail(transcript) {
  return chat([
    { role: 'system', content: BASE },
    {
      role: 'user',
      content: `Com base nesta transcrição, escreva um EMAIL DE FOLLOW-UP profissional em Português do Brasil.

O email deve ter:
- **Assunto** sugerido
- **Corpo**: agradecimento, resumo dos pontos principais, lista de próximos passos, encerramento cordial

Tom: profissional mas cordial.

Transcrição:
${transcript}`,
    },
  ])
}

export async function generateInsights(transcript) {
  return chat([
    { role: 'system', content: BASE },
    {
      role: 'user',
      content: `Faça uma análise de INSIGHTS da reunião:

1. **Tópicos principais** (3-5 temas mais discutidos)
2. **Decisões estratégicas** tomadas
3. **Pontos de tensão ou divergência** (se houver)
4. **Tom geral da reunião** (colaborativo, tenso, produtivo, etc.)
5. **Oportunidades ou riscos** identificados

Transcrição:
${transcript}`,
    },
  ])
}

export async function askQuestion(transcript, question) {
  return chat([
    { role: 'system', content: BASE },
    {
      role: 'user',
      content: `Com base na transcrição abaixo, responda à pergunta de forma objetiva e em Português do Brasil.

Pergunta: ${question}

Transcrição:
${transcript}`,
    },
  ])
}
