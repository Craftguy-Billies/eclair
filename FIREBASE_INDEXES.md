# Firebase Firestore Indexes

## What Are Indexes?

Indexes are database structures that make queries faster. Think of them like a book's index - instead of reading every page to find a topic, you look it up in the index and jump directly to the right page.

## Why You Need to Create One

Firebase Firestore **automatically creates indexes for simple queries** (filter by one field, sort by one field). But when you query with **multiple conditions**, like:

```javascript
// Sort by TWO fields: userId AND createdAt
db.collection('workspaces')
  .where('userId', '==', userId)
  .orderBy('createdAt', 'desc')
```

Firestore needs a **composite index** (an index combining multiple fields) to efficiently find and sort data. Without it, the query fails.

## Do You Create It for Every Workspace?

**No.** You create the index **once per query pattern**, not per workspace or per user.

- ✅ Create once: `userId + createdAt` index for the workspaces query
- ❌ NOT needed: Creating again for each user or workspace

After you create it, **all users benefit automatically**. It takes ~2 minutes to build the first time.

## Does This Affect User Experience?

**No.** Users never see index creation. It's a **one-time backend setup** that you (the developer) do during development or deployment.

- Users: No impact, queries just work
- Developer: Click the link once, wait 2 minutes, done forever

## When Do You Need More Indexes?

Only when you add **new query patterns**. Examples:

```javascript
// New query → Need new index
.where('userId', '==', uid).orderBy('title', 'asc')

// Different collection with sorting → Need index
.collection('notes').where('workspaceId', '==', id).orderBy('updatedAt', 'desc')
```

Firebase will tell you exactly what index to create (error message includes a direct link).

## Summary

- **What**: Database optimization structure
- **Why**: Multi-field queries require them
- **How often**: Once per unique query pattern
- **User impact**: None (backend-only, one-time setup)
- **Your app**: Currently needs 1 index for workspace listing

The index you're creating now handles all workspace queries for all users forever.
