package conversation

import (
	"context"
	"encoding/json"
	"strings"
	"time"

	"github.com/abhinavxd/libredesk/internal/conversation/models"
	"github.com/abhinavxd/libredesk/internal/envelope"
)

// UpsertConversationDraft saves a draft for a conversation. With shared drafts
// enabled an existing draft for the conversation and type is updated in place
// whichever agent owns it, so a draft can be picked up by a colleague or left
// by a bot; otherwise the draft is scoped to userID as usual.
func (m *Manager) UpsertConversationDraft(conversationID, userID int, draftType, content string, meta json.RawMessage, shared bool) (models.ConversationDraft, error) {
	var draft models.ConversationDraft
	content = rewriteInlineImagesToCID(content)

	if err := m.q.UpsertConversationDraft.Get(&draft, conversationID, userID, draftType, content, meta, shared); err != nil {
		m.lo.Error("error upserting conversation draft", "conversation_id", conversationID, "user_id", userID, "error", err)
		return draft, envelope.NewError(envelope.GeneralError, m.i18n.T("globals.messages.somethingWentWrong"), nil)
	}

	draft.Content = m.resolveDraftInlineCIDs(draft.Content)
	return draft, nil
}

// GetAllUserDrafts returns the drafts owned by userID, or every draft when
// shared drafts are enabled. Shared results carry the parent conversation's
// assignment so the caller can filter them by conversation access.
func (m *Manager) GetAllUserDrafts(userID int, shared bool) ([]models.ConversationDraft, error) {
	var drafts = make([]models.ConversationDraft, 0)
	if err := m.q.GetAllUserDrafts.Select(&drafts, userID, shared); err != nil {
		m.lo.Error("error fetching user drafts", "user_id", userID, "error", err)
		return nil, envelope.NewError(envelope.GeneralError, m.i18n.T("globals.messages.somethingWentWrong"), nil)
	}
	for i := range drafts {
		drafts[i].Content = m.resolveDraftInlineCIDs(drafts[i].Content)
	}
	return drafts, nil
}

// DeleteConversationDraft deletes a draft for a conversation by ID or UUID. An empty draftType deletes all types.
// With shared drafts enabled the draft is deleted whichever agent owns it.
func (m *Manager) DeleteConversationDraft(conversationID int, uuid string, userID int, draftType string, shared bool) error {
	var uuidParam any
	if uuid != "" {
		uuidParam = uuid
	}

	if _, err := m.q.DeleteConversationDraft.Exec(conversationID, uuidParam, userID, draftType, shared); err != nil {
		m.lo.Error("error deleting conversation draft", "conversation_id", conversationID, "uuid", uuid, "user_id", userID, "error", err)
		return envelope.NewError(envelope.GeneralError, m.i18n.T("globals.messages.somethingWentWrong"), nil)
	}

	return nil
}

// DeleteStaleDrafts deletes drafts older than the specified retention period.
func (m *Manager) DeleteStaleDrafts(ctx context.Context, retentionPeriod time.Duration) error {
	cutoff := time.Now().Add(-retentionPeriod)
	res, err := m.q.DeleteStaleDrafts.ExecContext(ctx, cutoff)
	if err != nil {
		m.lo.Error("error deleting stale drafts", "error", err)
		return err
	}

	rowsAffected, _ := res.RowsAffected()
	if rowsAffected > 0 {
		m.lo.Info("deleted stale drafts", "count", rowsAffected)
	}

	return nil
}

func (m *Manager) resolveDraftInlineCIDs(content string) string {
	cids := extractInlineContentIDs(content)
	for _, cid := range cids {
		uuid := strings.TrimPrefix(cid, "ldsk-")
		if uuid == "" {
			continue
		}
		media, err := m.mediaStore.Get(0, uuid)
		if err != nil {
			continue
		}
		content = strings.ReplaceAll(content, "cid:"+cid, m.mediaStore.GetURL(media.UUID, media.ContentType, media.Filename))
	}
	return content
}
