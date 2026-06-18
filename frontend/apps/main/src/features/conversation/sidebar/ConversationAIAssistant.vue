<template>
  <div class="space-y-3">
    <!-- AI Classification Tag -->
    <div class="flex items-center gap-2">
      <span class="text-sm text-muted-foreground">Classification:</span>
      <Badge v-if="aiTag" variant="secondary">{{ aiTag }}</Badge>
      <span v-else class="text-sm text-muted-foreground italic">No AI classification yet</span>
    </div>

    <!-- Action Buttons -->
    <div class="flex flex-wrap gap-2">
      <Button
        size="sm"
        variant="outline"
        :disabled="isProcessing"
        @click="redoAI"
      >
        <RefreshCw class="h-3.5 w-3.5 mr-1" :class="{ 'animate-spin': isProcessing }" />
        Redo AI
      </Button>

      <Button
        size="sm"
        variant="outline"
        :disabled="isProcessing"
        @click="confirmClear"
      >
        <Trash2 class="h-3.5 w-3.5 mr-1" />
        Delete AI
      </Button>

      <Button
        size="sm"
        variant="outline"
        :disabled="isProcessing"
        @click="generateReply"
      >
        <PenLine class="h-3.5 w-3.5 mr-1" />
        Generate Reply
      </Button>
    </div>

    <!-- Instructions Toggle -->
    <div>
      <button
        class="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        @click="showInstructions = !showInstructions"
      >
        <Plus v-if="!showInstructions" class="h-3 w-3" />
        <Minus v-else class="h-3 w-3" />
        {{ showInstructions ? 'Hide' : 'Add' }} instructions
      </button>
      <Textarea
        v-if="showInstructions"
        v-model="instructions"
        placeholder="Optional instructions for AI processing..."
        class="mt-2 text-sm"
        rows="2"
      />
    </div>

    <!-- Status Message -->
    <div
      v-if="statusMessage"
      class="text-sm px-2 py-1.5 rounded"
      :class="{
        'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300': statusType === 'success',
        'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300': statusType === 'error',
        'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300': statusType === 'info'
      }"
    >
      {{ statusMessage }}
    </div>

    <!-- Clear Confirmation Dialog -->
    <AlertDialog v-model:open="showClearConfirm">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete AI Content</AlertDialogTitle>
          <AlertDialogDescription>
            This will remove all AI-generated drafts, notes, and tags from this conversation. This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction @click="clearAI">Delete</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { Button } from '@shared-ui/components/ui/button'
import { Badge } from '@shared-ui/components/ui/badge'
import { Textarea } from '@shared-ui/components/ui/textarea'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction
} from '@shared-ui/components/ui/alert-dialog'
import { RefreshCw, Trash2, PenLine, Plus, Minus } from 'lucide-vue-next'
import { useAIAssistant } from './useAIAssistant'

const { isProcessing, statusMessage, statusType, instructions, aiTag, redoAI, clearAI, generateReply } =
  useAIAssistant()

const showInstructions = ref(false)
const showClearConfirm = ref(false)

function confirmClear() {
  showClearConfirm.value = true
}
</script>
