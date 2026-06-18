import { ref, watch, computed } from 'vue'
import axios from 'axios'
import { useConversationStore } from '@/stores/conversation'
import { useEmitter } from '@/composables/useEmitter'

const AI_TAG_PREFIX = 'ai:'

// Since v2.5.0 drafts are stored per reply type. The AI assistant posts drafts
// without a type, which the API defaults to 'reply'.
const AI_DRAFT_TYPE = 'reply'

const apiClient = axios.create({
  baseURL: '/ai-api',
  timeout: 120000,
  headers: {
    'X-AI-Assistant-Secret': import.meta.env.VITE_AI_ASSISTANT_SECRET || ''
  }
})

export function useAIAssistant() {
  const conversationStore = useConversationStore()
  const emitter = useEmitter()

  const isProcessing = ref(false)
  const statusMessage = ref('')
  const statusType = ref('info') // 'info' | 'success' | 'error'
  const instructions = ref('')

  const currentConversation = computed(() => conversationStore.current)

  // Find the AI classification tag from conversation tags
  const aiTag = computed(() => {
    const tags = currentConversation.value?.tags
    if (!Array.isArray(tags)) return null
    return tags.find((t) => typeof t === 'string' && t.startsWith(AI_TAG_PREFIX)) || null
  })

  // Reset state when conversation changes
  watch(
    () => currentConversation.value?.uuid,
    () => {
      statusMessage.value = ''
      statusType.value = 'info'
      instructions.value = ''
    }
  )

  function setStatus(message, type = 'info') {
    statusMessage.value = message
    statusType.value = type
  }

  /**
   * Poll for a new or updated draft to appear in the store.
   * Compares draft content against a snapshot taken before polling starts,
   * so it detects both new drafts and content changes from regeneration.
   */
  async function pollForDraft(uuid, { intervalMs = 3000, maxAttempts = 20 } = {}) {
    // The AI assistant writes replies, not private notes: the draft API defaults
    // an omitted type to 'reply', so that is the only type worth polling for.
    const existingDraft = conversationStore.getDraft(uuid, AI_DRAFT_TYPE)
    const existingContent = existingDraft?.content || ''

    for (let i = 0; i < maxAttempts; i++) {
      await new Promise(resolve => setTimeout(resolve, intervalMs))

      // Stop if user navigated to a different conversation
      if (currentConversation.value?.uuid !== uuid) return false

      await conversationStore.fetchAllDrafts()
      const draft = conversationStore.getDraft(uuid, AI_DRAFT_TYPE)
      if (draft && draft.content !== existingContent) {
        return true
      }
    }
    return false
  }

  async function redoAI() {
    const uuid = currentConversation.value?.uuid
    if (!uuid || isProcessing.value) return

    isProcessing.value = true
    setStatus('Reprocessing with AI...', 'info')
    try {
      const body = instructions.value ? { instructions: instructions.value } : {}
      const { data } = await apiClient.post(`/redo/${uuid}`, body)
      if (data.status === 'success') {
        setStatus('AI reprocessing queued — waiting for draft...', 'info')
        // Poll in the background (don't block the UI)
        pollForDraft(uuid).then(found => {
          if (currentConversation.value?.uuid !== uuid) return
          if (found) {
            setStatus('Draft ready', 'success')
            emitter.emit('ai:draft-ready', uuid)
          } else {
            setStatus('Draft may be ready — try refreshing', 'info')
          }
        })
      } else {
        setStatus(data.error || 'Redo failed', 'error')
      }
    } catch (err) {
      setStatus(err.response?.data?.detail || err.message, 'error')
    } finally {
      isProcessing.value = false
    }
  }

  async function clearAI() {
    const uuid = currentConversation.value?.uuid
    if (!uuid || isProcessing.value) return

    isProcessing.value = true
    setStatus('Clearing AI content...', 'info')
    try {
      const { data } = await apiClient.post(`/clear/${uuid}`)
      if (data.status === 'success') {
        setStatus('AI content cleared', 'success')
        // Refresh drafts store to reflect deletion
        await conversationStore.fetchAllDrafts()
        emitter.emit('ai:draft-cleared', uuid)
      } else {
        setStatus(data.error || 'Clear failed', 'error')
      }
    } catch (err) {
      setStatus(err.response?.data?.detail || err.message, 'error')
    } finally {
      isProcessing.value = false
    }
  }

  async function generateReply() {
    const uuid = currentConversation.value?.uuid
    if (!uuid || isProcessing.value) return

    isProcessing.value = true
    setStatus('Generating reply...', 'info')
    try {
      const body = instructions.value ? { instructions: instructions.value } : {}
      const { data } = await apiClient.post(`/generate-reply/${uuid}`, body)
      if (data.status === 'success') {
        setStatus('Reply generation queued — waiting for draft...', 'info')
        // Poll in the background (don't block the UI)
        pollForDraft(uuid).then(found => {
          if (currentConversation.value?.uuid !== uuid) return
          if (found) {
            setStatus('Draft ready', 'success')
            emitter.emit('ai:draft-ready', uuid)
          } else {
            setStatus('Draft may be ready — try refreshing', 'info')
          }
        })
      } else {
        setStatus(data.error || 'Generate reply failed', 'error')
      }
    } catch (err) {
      setStatus(err.response?.data?.detail || err.message, 'error')
    } finally {
      isProcessing.value = false
    }
  }

  return {
    isProcessing,
    statusMessage,
    statusType,
    instructions,
    aiTag,
    redoAI,
    clearAI,
    generateReply
  }
}
