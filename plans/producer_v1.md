# Producer V1 Architecture Migration Guide

## 🚨 Context: Why are we doing this?
Currently, the **Consumer app** has been migrated to the "V1 Architecture". It reads map data exclusively from the relational Postgres tables (`nodes` and `edges`). 
However, the **Producer app** (`MapEditor`) is still on the "V0 Architecture". It saves the entire map as a giant JSON string inside the `venue_content` table. 

Because of this mismatch, **any map changes made in the Producer are completely invisible to the Consumer.** Your goal is to rewrite the `saveGraph` function in the Producer so it writes directly to the new `nodes` and `edges` Postgres tables.

---

## 🎯 The Goal
Rewrite the `saveGraph` function inside `producer/src/hooks/useGraph.ts` so it:
1. Identifies new vs. existing nodes/edges.
2. Handles the "Negative ID" (Optimistic ID) edge case properly.
3. Inserts/Updates nodes into the `public.nodes` table.
4. Inserts/Updates edges into the `public.edges` table.
5. Deletes removed nodes/edges from the database.
6. Continues saving Sponsors to the legacy `venue_content` table.

---

## 🛠️ Step-by-Step Implementation Plan

### Step 1: Query the Database to Find Deletions
Because the map editor doesn't explicitly track what the user deleted, the safest way to find out is to ask the database what it currently has, and compare it to what the user is trying to save.

At the very top of your new `saveGraph` logic, run these queries:
```typescript
// 1. Fetch current IDs in the database for this venue
const { data: dbNodes } = await supabase.from('nodes').select('id').eq('venue_key', currentVenue.key);
const { data: dbEdges } = await supabase.from('edges').select('id').eq('venue_key', currentVenue.key);

const dbNodeIds = new Set((dbNodes || []).map(n => n.id));
const dbEdgeIds = new Set((dbEdges || []).map(e => e.id));

// 2. Figure out what the user deleted in the editor
const currentNodeIds = new Set(data.nodes.filter(n => n.id > 0).map(n => n.id));
const currentEdgeIds = new Set(data.edges.map(e => e.id));

const nodeIdsToDelete = [...dbNodeIds].filter(id => !currentNodeIds.has(id));
const edgeIdsToDelete = [...dbEdgeIds].filter(id => !currentEdgeIds.has(id));
```

### Step 2: Handle New Nodes (The Negative ID Edge Case)
When a user adds a new node in the editor, we temporarily give it a negative ID (e.g., `-54321`) so React can track it. Postgres `nodes` use auto-incrementing integers. **You must strip the negative ID before saving, or Postgres will crash.**

```typescript
// 1. Separate new nodes (negative ID) from existing nodes (positive ID)
const newNodes = data.nodes.filter(n => n.id < 0);
const existingNodes = data.nodes.filter(n => n.id > 0);

// We need a map to track old negative IDs to the new real IDs the DB gives us
const idMapping = new Map<number, number>();

// 2. Insert new nodes one by one (or in a batch if you format carefully)
for (const tempNode of newNodes) {
    // STRIP THE FAKE ID!
    const { id: fakeId, ...nodeDataToSave } = tempNode;
    
    // Ensure venue_key is set correctly
    const insertPayload = {
        ...nodeDataToSave,
        venue_key: currentVenue.key,
        // Make sure objects are stringified if your Supabase types require it for JSONB columns, 
        // though Supabase JS usually handles JSON objects automatically.
    };

    const { data: savedNode, error } = await supabase
        .from('nodes')
        .insert(insertPayload)
        .select() // Tells Supabase to return the newly generated row
        .single();
        
    if (error) throw error;
    
    // 3. Save the mapping so we can fix the edges next!
    idMapping.set(fakeId, savedNode.id);
}
```

### Step 3: Update Existing Nodes
Now that new nodes are inserted, update the existing ones using an `upsert`.

```typescript
if (existingNodes.length > 0) {
    const { error: upsertError } = await supabase
        .from('nodes')
        .upsert(existingNodes.map(n => ({
            ...n,
            venue_key: currentVenue.key
        })));
        
    if (upsertError) throw upsertError;
}
```

### Step 4: Fix and Save Edges
Edges are tricky because they point to `from` and `to` nodes. If they were pointing to a negative node ID, you MUST remap them using the `idMapping` we created in Step 2.
Also, note that the database uses `from_node_id` and `to_node_id`, but the frontend might be using `from` and `to`. You need to map the keys.

```typescript
const edgesToSave = data.edges.map(edge => {
    // Remap negative IDs to real IDs if necessary
    const actualFromId = idMapping.get(edge.from) || edge.from;
    const actualToId = idMapping.get(edge.to) || edge.to;
    
    return {
        id: edge.id, // (Assuming edge IDs are UUIDs. If they are also integers, apply the same negative ID logic!)
        venue_key: currentVenue.key,
        from_node_id: actualFromId,
        to_node_id: actualToId,
        distance_m: edge.distance_m || edge.weight || 0, // ensure distance is safely passed
        is_accessible: edge.is_accessible ?? true
    };
});

if (edgesToSave.length > 0) {
    const { error: edgeError } = await supabase.from('edges').upsert(edgesToSave);
    if (edgeError) throw edgeError;
}
```

### Step 5: Execute Deletions
Now clean up the database by removing the nodes and edges the user deleted.
*(Note: Delete edges BEFORE nodes to avoid Foreign Key constraint violations!)*

```typescript
if (edgeIdsToDelete.length > 0) {
    await supabase.from('edges').delete().in('id', edgeIdsToDelete);
}
if (nodeIdsToDelete.length > 0) {
    await supabase.from('nodes').delete().in('id', nodeIdsToDelete);
}
```

### Step 6: Save Legacy Data (Sponsors) to `venue_content`
The Consumer app still reads `sponsorZones` and `sponsors` from the JSON blob. So we still need to write to `venue_content`, but we can **exclude nodes and edges** to save bandwidth.

```typescript
const legacyGraphData = {
    sponsorZones: data.sponsorZones,
    sponsors: data.sponsors,
    defaultAds: data.defaultAds,
    categories: data.categories,
    events: data.events
};

await supabase.from('venue_content').upsert([
    {
        venue_key: currentVenue.key,
        content_type: 'graph',
        data: legacyGraphData,
        version: Math.floor(Date.now() / 1000),
        updated_at: new Date().toISOString()
    }
], {onConflict: 'venue_key,content_type'});
```

### Step 7: Update Local React State
Because we just generated new IDs in the database, the local React state inside `useGraph` still has the negative IDs. You need to update the local state with the actual DB state so the UI doesn't break if they keep editing without refreshing.

```typescript
// Replace the negative IDs in the local `data` state with the new mapped ones.
setData((prevData) => {
    const updatedNodes = prevData.nodes.map(n => 
        idMapping.has(n.id) ? { ...n, id: idMapping.get(n.id)! } : n
    );
    
    const updatedEdges = prevData.edges.map(e => ({
        ...e,
        from: idMapping.get(e.from) || e.from,
        to: idMapping.get(e.to) || e.to
    }));
    
    return { ...prevData, nodes: updatedNodes, edges: updatedEdges };
});
```

---

## ⚠️ Critical Edge Cases to Watch Out For

1. **Foreign Key Violations**: Always delete edges *before* deleting nodes. Always insert nodes *before* inserting edges. If you delete a node while an edge still points to it, Postgres will reject the transaction.
2. **Missing `venue_key`**: Every insert/upsert into `nodes` and `edges` requires the `venue_key`. Do not assume the frontend node object has it attached; inject it manually in your `.map()` functions (`venue_key: currentVenue.key`).
3. **Database Column Names vs Frontend Properties**: Look at how the DB expects it. The DB `edges` table uses `from_node_id` and `to_node_id`. The frontend usually uses `from` and `to`. You MUST map these when constructing your payload.

## ✅ Pre-PR Testing Checklist
- [ ] Add a completely new node in MapEditor, connect it to an existing node, and hit Save.
- [ ] Refresh the Producer. Did the node and connection persist?
- [ ] Open the Consumer app on localhost. Does the new node appear?
- [ ] Delete a node in the MapEditor and save. Ensure it disappears from both the Producer (after refresh) and the Consumer.
