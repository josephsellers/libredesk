import { ref, watch, computed } from 'vue'
import axios from 'axios'
import { useConversationStore } from '@/stores/conversation'
import { useStorage } from '@vueuse/core'

const CACHE_TTL_MS = 60 * 60 * 1000 // 60 minutes

const apiClient = axios.create({
  baseURL: '/ai-api',
  timeout: 30000,
  headers: {
    'X-AI-Assistant-Secret': import.meta.env.VITE_AI_ASSISTANT_SECRET || ''
  }
})

export function useWooCommerce() {
  const conversationStore = useConversationStore()

  const stores = ref([])
  const isLoading = ref(false)
  const error = ref('')

  const cache = useStorage('libredesk_woo_orders_cache', {})

  const contactEmail = computed(() => conversationStore.current?.contact?.email || '')

  function getCached(email) {
    const entry = cache.value[email]
    if (!entry) return null
    if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
      delete cache.value[email]
      return null
    }
    return entry.data
  }

  function setCache(email, data) {
    cache.value[email] = { data, timestamp: Date.now() }
  }

  async function fetchOrders(forceRefresh = false) {
    const email = contactEmail.value
    if (!email) {
      stores.value = []
      return
    }

    if (!forceRefresh) {
      const cached = getCached(email)
      if (cached) {
        stores.value = cached
        return
      }
    }

    isLoading.value = true
    error.value = ''
    try {
      const { data } = await apiClient.get('/orders', { params: { email } })
      stores.value = data.stores || []
      setCache(email, stores.value)
    } catch (err) {
      error.value = err.response?.data?.detail || err.message
      stores.value = []
    } finally {
      isLoading.value = false
    }
  }

  function refresh() {
    return fetchOrders(true)
  }

  // Auto-fetch when contact email changes
  watch(contactEmail, () => fetchOrders(), { immediate: true })

  return {
    stores,
    isLoading,
    error,
    refresh
  }
}
