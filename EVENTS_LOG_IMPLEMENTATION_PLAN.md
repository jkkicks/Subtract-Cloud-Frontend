# Events Log Implementation Plan

## Overview
This document outlines the implementation plan for adding a comprehensive events logging system to the Subtract Manufacturing admin dashboard. The events log will track all data changes across the application, including who made the change, when it occurred, and what specifically was modified.

## Goals
- Track all CRUD operations (Create, Read, Update, Delete/Archive) across all entities
- Record which user performed each action
- Maintain a complete audit trail with before/after values
- Provide a user-friendly interface for viewing and filtering events
- Ensure minimal performance impact on existing operations

## Prerequisites
Before implementing the events log, the following must be completed:
1. **User Authentication System** - Required to track "who" made changes
   - Implement login/logout functionality
   - Add session management
   - Create authentication middleware
   - Add user context to all routes

## Architecture

### Database Schema

#### 1. Events Log Table
```sql
CREATE TABLE events_log (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  user_id TEXT REFERENCES users(id),
  user_name TEXT NOT NULL, -- Denormalized for performance
  entity_type TEXT NOT NULL, -- 'customer', 'vendor', 'order', 'quote', 'part'
  entity_id TEXT NOT NULL,
  entity_name TEXT, -- Denormalized display name (e.g., customer name, order number)
  action TEXT NOT NULL, -- 'created', 'updated', 'archived', 'status_changed'
  field_name TEXT, -- Specific field that changed (null for create/archive)
  old_value JSONB, -- Previous value(s)
  new_value JSONB, -- New value(s)
  metadata JSONB, -- Additional context (IP, user agent, etc.)
  
  -- Indexes for performance
  INDEX idx_events_timestamp (timestamp DESC),
  INDEX idx_events_entity (entity_type, entity_id),
  INDEX idx_events_user (user_id),
  INDEX idx_events_action (action)
);
```

#### 2. Drizzle Schema Addition
```typescript
// In /app/lib/db/schema.ts
export const eventsLog = pgTable("events_log", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  timestamp: timestamp("timestamp", { withTimezone: true }).defaultNow().notNull(),
  userId: text("user_id").references(() => users.id),
  userName: text("user_name").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  entityName: text("entity_name"),
  action: text("action").notNull(),
  fieldName: text("field_name"),
  oldValue: jsonb("old_value"),
  newValue: jsonb("new_value"),
  metadata: jsonb("metadata"),
}, (table) => ({
  timestampIdx: index("idx_events_timestamp").on(table.timestamp.desc()),
  entityIdx: index("idx_events_entity").on(table.entityType, table.entityId),
  userIdx: index("idx_events_user").on(table.userId),
  actionIdx: index("idx_events_action").on(table.action),
}));
```

### Implementation Layers

#### 1. Event Logging Service
Create `/app/lib/events.ts`:
```typescript
interface EventLogEntry {
  userId: string;
  userName: string;
  entityType: 'customer' | 'vendor' | 'order' | 'quote' | 'part';
  entityId: string;
  entityName?: string;
  action: 'created' | 'updated' | 'archived' | 'status_changed';
  fieldName?: string;
  oldValue?: any;
  newValue?: any;
  metadata?: Record<string, any>;
}

export async function logEvent(entry: EventLogEntry) {
  // Implementation
}

export async function getEvents(filters?: EventFilters) {
  // Implementation with pagination
}
```

#### 2. Data Access Layer Integration
Modify each entity's data access functions to include event logging:

**Example for customers.ts:**
```typescript
export async function createCustomer(data: CustomerInput, userId: string, userName: string) {
  const customer = await db.insert(customers).values(data).returning();
  
  await logEvent({
    userId,
    userName,
    entityType: 'customer',
    entityId: customer[0].id,
    entityName: customer[0].name,
    action: 'created',
    newValue: customer[0],
  });
  
  return customer[0];
}
```

#### 3. Middleware Approach (Alternative)
Create a wrapper function for automatic logging:
```typescript
export function withEventLogging<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  getEventData: (args: Parameters<T>, result: Awaited<ReturnType<T>>) => EventLogEntry
): T {
  return (async (...args: Parameters<T>) => {
    const result = await fn(...args);
    const eventData = getEventData(args, result);
    await logEvent(eventData);
    return result;
  }) as T;
}
```

## UI Implementation

### 1. Events Log Route
Create `/app/routes/events.tsx`:
- Display events in a table format similar to existing tables
- Include filters for:
  - Date range (today, last 7 days, last 30 days, custom)
  - Entity type (customers, vendors, orders, etc.)
  - User (dropdown of all users)
  - Action type (created, updated, archived, etc.)
- Show event details in an expandable row or modal

### 2. Event Display Components

#### EventsTable Component
```typescript
interface Event {
  id: string;
  timestamp: Date;
  userName: string;
  entityType: string;
  entityName: string;
  action: string;
  description: string; // Generated from action + field changes
}

export function EventsTable({ events }: { events: Event[] }) {
  // Table implementation with:
  // - Timestamp (relative time like "2 hours ago")
  // - User who made the change
  // - Description of what happened
  // - Link to view the entity
  // - Expand button for details
}
```

#### Event Detail View
- Show full before/after values for updates
- Display all metadata
- Format JSON data in a readable way
- Include direct link to the affected entity

### 3. UI Integration Points

#### Dashboard Integration
- Add recent events widget to dashboard
- Show last 5-10 events
- Link to full events log page

#### Entity Pages Integration
- Add "View History" button to each entity's detail view
- Show filtered events for that specific entity
- Display in a modal or slide-out panel

## Implementation Steps

### Phase 1: Foundation (Prerequisites)
1. Implement user authentication system
2. Add session management and user context
3. Create auth middleware for routes

### Phase 2: Database Setup
1. Create events_log table migration
2. Update Drizzle schema
3. Generate TypeScript types
4. Run migration

### Phase 3: Core Event Logging
1. Create event logging service (`/app/lib/events.ts`)
2. Add logging to critical operations first:
   - Order creation and status changes
   - Quote creation and status changes
3. Test logging functionality

### Phase 4: Extend to All Entities
1. Add logging to customer CRUD operations
2. Add logging to vendor CRUD operations
3. Add logging to parts operations
4. Ensure all archive operations are logged

### Phase 5: UI Implementation
1. Create events route and basic table view
2. Add filtering capabilities
3. Implement event detail view
4. Add search functionality

### Phase 6: Integration and Polish
1. Add recent events to dashboard
2. Add entity-specific history views
3. Implement pagination for large datasets
4. Add export functionality (CSV/JSON)

### Phase 7: Performance Optimization
1. Add appropriate database indexes
2. Implement event log retention policy
3. Consider archiving old events
4. Add caching for frequently accessed data

## Technical Considerations

### Performance
- Use database triggers as an alternative to application-level logging
- Implement asynchronous logging to avoid blocking operations
- Consider using a queue for high-volume operations
- Add indexes for common query patterns

### Security
- Ensure events log is read-only for most users
- Consider role-based access for sensitive operations
- Encrypt sensitive data in old/new value fields
- Never log passwords or other credentials

### Data Retention
- Define retention policy (e.g., keep events for 2 years)
- Implement automated cleanup job
- Consider archiving to cold storage
- Provide export before deletion

### Scalability
- Design for horizontal scaling from the start
- Consider separate database for events if volume is high
- Use partitioning for large tables
- Implement efficient querying strategies

## Testing Strategy

### Unit Tests
- Test event logging service functions
- Verify correct event data capture
- Test filter and search functionality

### Integration Tests
- Verify events are logged for all operations
- Test database performance with large datasets
- Ensure no impact on existing functionality

### End-to-End Tests
- Test complete user workflows with event logging
- Verify UI displays events correctly
- Test filtering and search features

## Success Metrics
- 100% of data modifications are logged
- Event queries complete in < 200ms
- No noticeable performance impact on CRUD operations
- Users can find relevant events within 3 clicks
- Zero data loss in event logging

## Future Enhancements
1. Real-time event notifications
2. Event-based webhooks for external systems
3. Advanced analytics and reporting
4. Anomaly detection for suspicious activities
5. Integration with external audit tools
6. Event replay functionality for debugging