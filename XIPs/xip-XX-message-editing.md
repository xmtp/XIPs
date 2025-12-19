---
xip: 77
title: Editable messages
description: Proposes a message editing feature that allows a user to edit their own messages.
author: Mojtaba Chenani (@mchenani)
discussions-to: TBD
status: Draft
type: Standards
category: XRC
created: 2025-12-12
---

## Abstract

This XIP proposes a message editing feature for XMTP that allows a user to edit their own messages. The implementation maintains edit history while displaying only the latest version to users. The design follows the existing pattern established by the [Reply content type](https://docs.xmtp.org/chat-apps/content-types/replies), using reference parameters to indicate edits without requiring new content types.

## Motivation

Users frequently need to correct typos, update information, or clarify their messages after sending. Currently, XMTP does not support message editing, forcing users to either send correction messages or delete and resend. Message editing is a fundamental feature in modern messaging apps that improves user experience and communication clarity.

> [!NOTE]
> This XIP is designed for human-to-human messaging applications where users need to see edit history and indicators (e.g., "edited" badges, timestamps of original vs edited messages). For agent/bot use cases that require seamless, invisible message updates (where the edited content silently replaces the original without any indication), a separate XIP will address that workflow.

## Specification

### Core requirements

#### Authorization

- Only the original message sender can edit their message
- Editor's `inbox_id` must match original sender's `inbox_id`
- Original message's `group_id` must match

#### Edit chain management

- First edit references the original message
- Later edits reference the previous edit (forming a chain)
- Each edit is a new MLS message with the same content type as the original
- Database stores the full edit chain for each message

#### Content restrictions (v1)

- Text messages: Full content editable
- Attachments: Only caption/description text editable
- Reply messages: Only reply text editable (preserve reply reference)
- Reactions: NOT editable (doesn't make sense)
- Delete messages: NOT editable (final action)
- Group updates: NOT editable (system messages)

### Protocol design

This XIP evaluates three alternative approaches for implementing message editing at the protocol level.

#### Approach 1: Dedicated EditMessage content type (Separate content + command)

Send the new message content separately, then send an edit command message:

**Step 1**: Send the new content as a regular message (but mark it as pending/draft)
**Step 2**: Send an EditMessage that references both the original and the new content

```protobuf
message EditMessage {
    string edited_message_id = 1;        // ID of message being edited
    string new_message_id = 2;           // ID of the new content message
}
```

**Pros**:

- Clean separation between content and command
- New content already exists as a proper message
- Could reuse existing message infrastructure

**Cons**:

- Requires two messages per edit (overhead)
- Draft message storage and cleanup complexity
- More complex sync logic

#### Approach 2: Dedicated EditMessage content type with embedded content

Create a new content type specifically for edits:

```protobuf
message EditMessage {
    string edited_message_id = 1;        // ID of message being edited
    EncodedContent new_content = 2;      // New message content (embedded)
}
```

**Validation rules**:

1. Editor's `inbox_id` must match original sender's `inbox_id`
2. `edited_message_id` must belong to the same group
3. `new_content.type` must match original message's content type
4. Original message must not be deleted
5. Original message must be an editable type

**Pros**:

- Single message per edit (efficient)
- Clear semantic meaning
- Dedicated validation logic
- Similar pattern to DeleteMessage (consistency)

**Cons**:

- New content type to implement
- Additional bindings work

#### Approach 3: Reuse existing content types with reference parameter (RECOMMENDED)

Add an `editedMessageId` parameter to existing content types (Text, Attachment, etc.) to indicate this is an edit. This follows the exact pattern established by the [Reply content type](https://docs.xmtp.org/chat-apps/content-types/replies).

**Example for text message**:

```rust
// Normal text message
EncodedContent {
    type: ContentTypeId { authority_id: "xmtp.org", type_id: "text", ... },
    parameters: {},
    content: "Hello world"
}

// Edit message (same type, with reference parameter)
EncodedContent {
    type: ContentTypeId { authority_id: "xmtp.org", type_id: "text", ... },
    parameters: {
        "editedMessageId": "abc123",  // Indicates this is an edit
    },
    content: "Hello world (edited)"
}
```

**Similar to reply pattern**:

Just like `ReplyCodec` uses parameters (`reference`, `referenceInboxId`, `contentType`) to store metadata while embedding content, we use the same pattern for edits.

**Validation rules**:

1. If `editedMessageId` parameter present → treat as edit message
2. Editor's `inbox_id` must match original sender's `inbox_id`
3. Edited message must belong to the same group
4. **Content type must match**: If editing a text message, new message must also be text
5. Original message must not be deleted
6. Original message must be an editable type

**Pros**:

- No new content type needed (use existing Text, Attachment, etc.)
- Follows established pattern (Reply already uses this approach)
- Less protocol overhead
- Simpler bindings (no new types)
- Backward compatible (old clients ignore parameter)
- Minimal protocol changes

**Cons**:

- Less explicit than dedicated EditMessage type
- Requires discipline to validate content type matching
- Parameters parsed from every message (slight overhead)

### Recommended approach

**This XIP recommends Approach 3** (reference parameter) for the following reasons:

1. **Follows existing patterns**: Reply content type already uses this exact pattern
2. **Minimal protocol changes**: No new protobuf definitions needed
3. **Implementation simplicity**: Reuse existing codec infrastructure
4. **Backward compatibility**: Old clients can display as normal messages
5. **Flexibility**: Can add more metadata via parameters without protocol changes

### Database schema

**New table: `message_edits`**

```sql
CREATE TABLE message_edits (
    id INTEGER PRIMARY KEY,
    message_id BLOB NOT NULL,           -- The edit message ID
    original_message_id BLOB NOT NULL,  -- Root message being edited
    edited_message_id BLOB NOT NULL,    -- Direct parent (original or prev edit)
    editor_inbox_id TEXT NOT NULL,      -- Must match original sender
    group_id BLOB NOT NULL,             -- For cross-group validation
    edit_timestamp_ns BIGINT NOT NULL,  -- When edit was sent
    created_at_ns BIGINT NOT NULL,      -- When record was created
    UNIQUE(message_id)
);

CREATE INDEX idx_edits_original ON message_edits(original_message_id);
CREATE INDEX idx_edits_edited ON message_edits(edited_message_id);
CREATE INDEX idx_edits_group ON message_edits(group_id, original_message_id);
```

### API design

```rust
/// Core edit function
async fn edit_message(
    &self,
    message_id: Vec<u8>,
    new_content: String,
) -> Result<(), GroupError>

/// Check if message can be edited
fn can_edit_message(&self, message_id: &[u8]) -> Result<bool, GroupError>

/// Get edit history for a message
async fn get_message_edit_history(
    &self,
    message_id: &[u8],
) -> Result<Vec<EditRecord>, GroupError>

/// Get the latest version of a message
async fn get_latest_message_version(
    &self,
    message_id: &[u8],
) -> Result<Option<StoredGroupMessage>, GroupError>
```

### Message flow

#### Edit a text message

1. **User calls** `edit_message(message_id, "New text")`
2. **Validate**:
   - Fetch original message
   - Check sender owns it
   - Check same group
   - Check message is editable type (Text)
3. **Create edit message**:

   ```rust
   let edit_content = TextCodec::encode_edit(
       "New text".to_string(),
       hex::encode(&message_id)
   )?;
   ```

4. **Send as MLS message** (just like normal text message)
5. **Store edit record immediately** (optimistic UI):

   ```rust
   StoredMessageEdit {
       message_id: new_message_id,
       original_message_id: original_msg_id,
       edited_message_id: message_id, // What we're editing
       editor_inbox_id: self.inbox_id(),
       group_id: self.group_id.clone(),
       edit_timestamp_ns: now(),
       created_at_ns: now(),
   }.store(conn)?;
   ```

6. **Sync propagates** edit to other members

#### Process received edit (sync)

```rust
// In process_message() during sync
fn process_message(message: DecryptedMessage) -> Result<()> {
    let content = EncodedContent::decode(&message.decrypted_message_bytes)?;

    // Check if this is an edit message
    if let Some(edited_message_id) = content.parameters.get("editedMessageId") {
        let edited_id = hex::decode(edited_message_id)?;

        // Validate edit
        let original_msg = self.find_message(&edited_id)?;

        // CRITICAL VALIDATIONS:

        // 1. Same group
        if original_msg.group_id != self.group_id {
            tracing::warn!("Cross-group edit attempt");
            return Ok(());
        }

        // 2. Same sender
        if original_msg.sender_inbox_id != message.sender_inbox_id {
            tracing::warn!("Unauthorized edit attempt");
            return Ok(());
        }

        // 3. Content type matches
        if original_msg.content_type != extract_content_type(&content) {
            tracing::warn!("Content type mismatch in edit");
            return Ok(());
        }

        // 4. Original not deleted
        if self.is_message_deleted(&edited_id)? {
            tracing::warn!("Cannot edit deleted message");
            return Ok(());
        }

        // Store the edit record (idempotent)
        StoredMessageEdit {
            message_id: message.id.clone(),
            original_message_id: find_original_message_id(&edited_id)?,
            edited_message_id: edited_id,
            editor_inbox_id: message.sender_inbox_id.clone(),
            group_id: self.group_id.clone(),
            edit_timestamp_ns: message.sent_at_ns,
            created_at_ns: now(),
        }.store_or_ignore(conn)?;
    }

    // Store the message normally (edit messages are also stored)
    store_group_message(message)?;

    Ok(())
}
```

### Content type matching validation

This is critical for Approach 3. Ensures edit messages have the same content type as the original.

```rust
fn validate_edit_content_type(
    original: &StoredGroupMessage,
    edit_content: &EncodedContent
) -> Result<(), EditMessageError> {
    let original_type = parse_content_type(&original.content_type)?;
    let edit_type = edit_content.r#type.as_ref()
        .ok_or(EditMessageError::MissingContentType)?;

    // Must match exactly (authority, type_id, major version)
    if original_type.authority_id != edit_type.authority_id
        || original_type.type_id != edit_type.type_id
        || original_type.version_major != edit_type.version_major
    {
        return Err(EditMessageError::ContentTypeMismatch);
    }

    Ok(())
}
```

### Message enrichment and display

#### Core principle

When a message is edited, SDK users receive the **edited content** in place of the original message, but with **metadata about both** the original and the edit. This allows UIs to:

- Display the latest content to users
- Show "edited" indicators
- Preserve original message ordering (by original timestamp)
- Optionally show edit history

#### Enrichment logic

1. After loading messages, apply edit relations
2. For each message with edits, replace content with latest edit
3. Add metadata exposing both original and edit information
4. If editing chain incomplete (missing parent), mark as `pending_edit`

#### Enhanced DecodedMessage

```rust
pub struct DecodedMessage {
    // Original message identifiers (preserved for ordering and references)
    pub id: Vec<u8>,                         // Original message ID
    pub sent_at_ns: i64,                     // Original sent timestamp (for ordering)

    // Content (replaced with latest edit if edited)
    pub content: MessageBody,                // Latest content (original or edited)

    // Edit metadata (only present if message was edited)
    pub edited: bool,                        // True if message has been edited
    pub edit_count: u32,                     // Number of times edited
    pub original_sent_at_ns: Option<i64>,    // Same as sent_at_ns (for clarity)
    pub last_edit_sent_at_ns: Option<i64>,   // When the latest edit was sent
    pub last_edit_message_id: Option<Vec<u8>>, // ID of the edit message
}
```

**Display behavior**:

- `id` and `sent_at_ns` always refer to the **original** message (for stable ordering and reply references)
- `content` contains the **latest version** (edited content if edited, original otherwise)
- `edited: true` indicates the content has been modified
- `last_edit_sent_at_ns` can be used to show "Edited at [time]" in UI
- Edit history can be fetched separately via `get_message_edit_history()`

**Example UI rendering**:

```text
[Alice] Hello world!              <- content (latest)
        Sent 10:00 AM            <- sent_at_ns (original)
        Edited at 10:05 AM       <- last_edit_sent_at_ns
```

#### Pending edit handling

- If edit message arrives before original: store edit record but mark as "pending"
- Don't show edited content until original message arrives
- On original arrival, apply pending edits in chronological order
- During sync, check for pending edits after processing messages

### Conflict resolution

**Multiple edits for same message**:

- Use `edit_timestamp_ns` as tiebreaker (latest wins)
- If timestamps identical, use `message_id` lexicographic order
- Database query returns latest edit per original message

```sql
-- Get latest edit for each original message
SELECT * FROM message_edits
WHERE original_message_id = ?
ORDER BY edit_timestamp_ns DESC, message_id DESC
LIMIT 1;
```

### Pagination considerations

#### Query behavior

- `messages()` query returns original messages (not edit messages)
- Edit messages are metadata, not shown as separate entries
- Pagination cursor based on original message timestamps
- Edit metadata attached during enrichment phase

#### Performance

- Index on `(original_message_id, edit_timestamp_ns)`
- Batch edit lookup during enrichment (single query for page)
- Cache latest edit per message in memory during pagination

### Security validations

Critical validation checklist:

1. **Cross-group prevention**: Validate original message and edit in same group
2. **Ownership check**: Verify `editor_inbox_id` matches original sender
3. **Content type matching**: Ensure edit content type matches original
4. **Content type validation**: Reject edits for non-editable message types
5. **Deletion check**: Cannot edit deleted messages
6. **Chain integrity**: When editing an edit, validate the chain links back to original

```rust
// Validation in edit_message()
let original_msg = self.find_message(&message_id)?;

// Cross-group check
if original_msg.group_id != self.group_id {
    return Err(EditMessageError::NotAuthorized.into());
}

// Ownership check
let sender_inbox_id = self.client.inbox_id();
if original_msg.sender_inbox_id != sender_inbox_id {
    return Err(EditMessageError::NotAuthorized.into());
}

// Content type check - ensure we're sending matching type
let original_content_type = parse_content_type(&original_msg.content_type)?;
if !is_editable_content_type(&original_content_type) {
    return Err(EditMessageError::NotEditableType.into());
}

// Deletion check
if self.is_message_deleted(&message_id)? {
    return Err(EditMessageError::CannotEditDeleted.into());
}
```

### Edge cases

#### Deleted messages

- Cannot edit deleted messages
- Check deletion table before allowing edit
- If message edited then deleted, show deleted state (not edit)

#### Reply references

- If editing a message that has replies, preserve original ID
- Replies continue referencing original `message_id`
- UI shows "(edited)" next to referenced message content

#### Reactions

- Reactions remain on original `message_id`
- Editing doesn't affect reactions
- All reactions preserved across edits or we can discard them

#### Message ordering

- Edit messages have their own timestamps for MLS ordering
- Display uses original message timestamp for chronological order
- "Last modified" metadata shows latest edit timestamp

#### Edit messages in query results

- Edit messages should NOT appear in `messages()` results
- Only original messages appear
- Filter during query or enrichment phase
- Fetch edit messages separately to apply edits

### Bindings support

All bindings expose messages with the enriched edit metadata. The message retains its original `id` and `sent_at_ns` for ordering, while `content` reflects the latest version.

#### WASM Bindings

```typescript
interface DecodedMessage {
    // Original message identifiers (preserved)
    id: Uint8Array;
    senderInboxId: string;
    sentAtNs: bigint;              // Original timestamp for ordering

    // Content (latest version)
    content: DecodedMessageContent;

    // Edit metadata
    edited: boolean;
    editCount: number;
    lastEditSentAtNs?: bigint;     // When the latest edit was sent
    lastEditMessageId?: Uint8Array; // ID of the edit message
}
```

#### Node.js bindings

```typescript
interface DecodedMessage {
    // Original message identifiers (preserved)
    id: Uint8Array;
    senderInboxId: string;
    sentAtNs: bigint;              // Original timestamp for ordering

    // Content (latest version)
    content: DecodedMessageContent;

    // Edit metadata
    edited: boolean;
    editCount: number;
    lastEditSentAtNs?: bigint;     // When the latest edit was sent
    lastEditMessageId?: Uint8Array; // ID of the edit message
}
```

#### FFI bindings (Swift/Kotlin)

```swift
struct FfiDecodedMessage {
    // Original message identifiers (preserved)
    let id: Data
    let senderInboxId: String
    let sentAtNs: Int64            // Original timestamp for ordering

    // Content (latest version)
    let content: FfiDecodedMessageContent

    // Edit metadata
    let edited: Bool
    let editCount: UInt32
    let lastEditSentAtNs: Int64?   // When the latest edit was sent
    let lastEditMessageId: Data?   // ID of the edit message
}
```

## Rationale

Comparison on alternative approaches considered:

| Aspect | Approach 1 (Separate) | Approach 2 (Dedicated) | Approach 3 (Reference) ✅ |
|--------|---------------------|----------------------|--------------------------|
| Protocol overhead | 2 messages per edit | 1 message per edit | 1 message per edit |
| New content type | Yes | Yes | No |
| Bindings work | High | Medium | Low |
| Backward compatibility | Poor | Poor | Excellent |
| Implementation complexity | High | Medium | Low |
| Follows existing pattern | No | No (like Delete) | Yes (like Reply) |
| Content type validation | Automatic | Manual | Manual but simple |
| Semantic clarity | Medium | High | Medium |

### Rationale for approach 3

- Minimal protocol changes
- Follows established Reply pattern
- Backward compatible
- Simple implementation
- Flexible (add metadata via parameters)

The key insight is that Reply already demonstrates this pattern and it works well in production. We're applying the same principle to edits.

## Backward compatibility

### Using approach 3 (RECOMMENDED)

- Old clients that don't support editing will display edit messages as normal messages
- The `editedMessageId` parameter is ignored by old clients
- This provides graceful degradation
- No protocol version bump required

#### Migration strategy

- Feature can be rolled out without coordinated upgrade
- Clients can opt-in to edit support at their own pace
- Edit functionality works between supporting clients
- Non-supporting clients see the latest message content (but without "edited" indicator)

## Test cases

TBD

## Reference implementation

Here are the proposed implementation phases:

### Phase 1 (v1 - MVP)

- Text message editing only
- Single edit per message (no chain)
- Basic UI indicator ("edited")
- Use approach 3 (reference parameter)

### Phase 2 (edit chains)

- Edit chains (edit the edit)
- Attachment caption editing
- Conflict resolution improvements
- Edit history tracking

### Phase 3 (advanced features)

- Edit history UI
- Rich content editing (formatting preservation)
- Edit notifications/events
- Configurable edit time limits

## Security considerations

1. **Authorization**: Only original sender can edit their messages
2. **Cross-group protection**: Edits validated to be in same group as original
3. **Content type enforcement**: Edit must match original message's content type
4. **Deletion precedence**: Deleted messages cannot be edited
5. **Idempotent processing**: Edit records use `store_or_ignore()` to handle duplicates
6. **Chain validation**: Edit chains must link back to valid original message

### Threat model

TBD

## Open questions

1. **Edit time limit**: Should there be a time window after which messages cannot be edited (e.g., 24 hours)?
2. **Edit count limit**: Maximum number of edits per message (prevent abuse)?
3. **Edit history privacy**: Should edit history be visible to all members or just sender?
4. **Notification strategy**: Should edits trigger notifications like new messages? No?
5. **Search indexing**: Should search include edit history or only latest version?

## Copyright

Copyright and related rights waived via [CC0](https://creativecommons.org/publicdomain/zero/1.0/).
