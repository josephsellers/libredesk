<template>
  <div class="space-y-3">
    <!-- Header with refresh -->
    <div class="flex items-center justify-between">
      <span class="text-sm font-medium">Customer Orders</span>
      <Button size="sm" variant="ghost" :disabled="isLoading" @click="refresh" class="h-6 w-6 p-0">
        <RefreshCw class="h-3.5 w-3.5" :class="{ 'animate-spin': isLoading }" />
      </Button>
    </div>

    <!-- Loading -->
    <div v-if="isLoading && stores.length === 0" class="flex justify-center py-4">
      <Spinner />
    </div>

    <!-- Error -->
    <div v-else-if="error" class="text-sm text-destructive">{{ error }}</div>

    <!-- Store Sections -->
    <div v-else>
      <div v-for="store in stores" :key="store.name" class="mb-3 last:mb-0">
        <h4 class="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
          {{ store.name }}
        </h4>

        <div v-if="store.orders.length === 0" class="text-sm text-muted-foreground italic">
          No orders found
        </div>

        <div v-else class="space-y-1.5">
          <div
            v-for="order in store.orders"
            :key="order.id"
            class="flex items-center justify-between text-sm gap-2"
          >
            <div class="flex items-center gap-1.5 min-w-0">
              <a
                :href="order.url"
                target="_blank"
                rel="noopener"
                class="text-primary hover:underline font-mono shrink-0"
              >
                {{ order.number }}
              </a>
              <span class="text-muted-foreground truncate">
                {{ formatCurrency(order.total, order.currency) }}
              </span>
            </div>
            <div class="flex items-center gap-1.5 shrink-0">
              <span class="text-xs text-muted-foreground">{{ formatDate(order.date) }}</span>
              <Badge :variant="statusVariant(order.status)" class="text-[10px] px-1.5 py-0">
                {{ order.status }}
              </Badge>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { Button } from '@shared-ui/components/ui/button'
import { Badge } from '@shared-ui/components/ui/badge'
import { Spinner } from '@shared-ui/components/ui/spinner'
import { RefreshCw } from 'lucide-vue-next'
import { format } from 'date-fns'
import { useWooCommerce } from './useWooCommerce'

const { stores, isLoading, error, refresh } = useWooCommerce()

const CURRENCY_SYMBOLS = {
  GBP: '\u00A3',
  USD: '$',
  EUR: '\u20AC'
}

function formatCurrency(amount, currency) {
  const symbol = CURRENCY_SYMBOLS[currency] || currency + ' '
  return `${symbol}${amount}`
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  try {
    return format(new Date(dateStr), 'dd MMM yyyy')
  } catch {
    return dateStr
  }
}

function statusVariant(status) {
  switch (status) {
    case 'completed':
      return 'default'
    case 'processing':
      return 'secondary'
    case 'cancelled':
    case 'refunded':
    case 'failed':
      return 'destructive'
    default:
      return 'outline'
  }
}
</script>
